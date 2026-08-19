import pytest

from app import models
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def _patch_distribution_background_session(monkeypatch):
    # _send_distribution opens its own DB session via app.database.SessionLocal directly (it's a
    # BackgroundTask, not a request-scoped dependency), so it never goes through the get_db
    # override conftest.py installs for the rest of the app - without this patch it silently
    # no-ops against an unrelated (real) database instead of the test's in-memory one.
    monkeypatch.setattr("app.routers.distributions.SessionLocal", TestingSessionLocal)


def _admin_headers(client, make_user, email="distadmin@example.com"):
    make_user(email=email, password="adminpass123", role="admin")
    login = client.post("/auth/login", data={"username": email, "password": "adminpass123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_survey(db_session, question_he="שאלה"):
    survey = models.Survey(question_he=question_he, poll_type="text", max_choices=1)
    db_session.add(survey)
    db_session.flush()
    db_session.add(models.SurveyOption(survey_id=survey.id, label_override_he="כן"))
    db_session.add(models.SurveyOption(survey_id=survey.id, label_override_he="לא"))
    db_session.commit()
    db_session.refresh(survey)
    return survey


def _create_distribution(client, headers, survey_id, channels):
    resp = client.post(
        "/admin/distributions",
        json={
            "distribution_type": "survey",
            "survey_id": survey_id,
            "title_he": "כותרת",
            "channels": channels,
        },
        headers=headers,
    )
    assert resp.status_code == 200
    return resp.json()


def test_whatsapp_only_distribution_awaits_confirmation(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["whatsapp"])

    send_resp = client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    assert send_resp.status_code == 200

    list_resp = client.get("/admin/distributions", headers=headers)
    updated = next(d for d in list_resp.json() if d["id"] == dist["id"])
    assert updated["status"] == "awaiting_whatsapp_confirmation"
    assert updated["whatsapp_confirmed_at"] is None


def test_confirm_whatsapp_flips_status_and_stamps_timestamp(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["whatsapp"])
    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)

    confirm_resp = client.patch(f"/admin/distributions/{dist['id']}/confirm-whatsapp", headers=headers)
    assert confirm_resp.status_code == 200
    body = confirm_resp.json()
    assert body["status"] == "sent"
    assert body["whatsapp_confirmed_at"] is not None
    assert body["sent_at"] is not None


def test_confirm_whatsapp_rejected_without_whatsapp_channel(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    resp = client.patch(f"/admin/distributions/{dist['id']}/confirm-whatsapp", headers=headers)
    assert resp.status_code == 400


def test_delete_allowed_while_awaiting_whatsapp_confirmation(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["whatsapp"])
    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)

    delete_resp = client.delete(f"/admin/distributions/{dist['id']}", headers=headers)
    assert delete_resp.status_code == 200


def test_delete_rejected_once_confirmed_sent(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["whatsapp"])
    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    client.patch(f"/admin/distributions/{dist['id']}/confirm-whatsapp", headers=headers)

    delete_resp = client.delete(f"/admin/distributions/{dist['id']}", headers=headers)
    assert delete_resp.status_code == 400


def test_mixed_channel_status_reflects_email_independent_of_whatsapp(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email", "whatsapp"])
    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)

    list_resp = client.get("/admin/distributions", headers=headers)
    updated = next(d for d in list_resp.json() if d["id"] == dist["id"])
    # No target members exist, so the email loop sends to nobody - 0 sends/0 failures still
    # counts as a successful (vacuously true) email send, same as before this session's fix.
    # What matters here is that whatsapp_confirmed_at stays independently untouched.
    assert updated["status"] == "sent"
    assert updated["whatsapp_confirmed_at"] is None


def test_manual_whatsapp_share_creates_already_confirmed_row(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)

    resp = client.post(
        "/admin/distributions/manual-whatsapp-share",
        json={"distribution_type": "survey", "survey_id": survey.id, "title_he": survey.question_he},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "sent"
    assert body["is_manual_share"] is True
    assert body["whatsapp_confirmed_at"] is not None
    assert body["channels"] == ["whatsapp"]


def test_send_respects_concurrent_whatsapp_confirmation(client, db_session, make_user):
    """Regression test: POST .../send returns (merely scheduling the background task) before the
    task actually runs, so an admin can plausibly confirm via a separate request while
    _send_distribution is still mid-flight. The background task must not blindly overwrite an
    out-of-band confirmation back to awaiting_whatsapp_confirmation."""
    from datetime import datetime

    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["whatsapp"])

    # Simulate a confirmation that raced ahead of the background task's own final status write.
    row = db_session.query(models.Distribution).filter(models.Distribution.id == dist["id"]).first()
    row.whatsapp_confirmed_at = datetime.utcnow()
    db_session.commit()

    send_resp = client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    assert send_resp.status_code == 200

    list_resp = client.get("/admin/distributions", headers=headers)
    updated = next(d for d in list_resp.json() if d["id"] == dist["id"])
    assert updated["status"] == "sent"
    assert updated["whatsapp_confirmed_at"] is not None


def test_manual_whatsapp_share_requires_admin(client, make_user):
    member = make_user(email="plainmember2@example.com", password="testpass123")
    login = client.post("/auth/login", data={"username": "plainmember2@example.com", "password": "testpass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.post(
        "/admin/distributions/manual-whatsapp-share",
        json={"distribution_type": "survey", "survey_id": None, "title_he": "x"},
        headers=headers,
    )
    assert resp.status_code == 403
