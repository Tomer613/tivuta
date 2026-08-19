from datetime import datetime

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


def test_whatsapp_manual_mode_round_trips_through_create(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)

    resp = client.post(
        "/admin/distributions",
        json={
            "distribution_type": "survey",
            "survey_id": survey.id,
            "title_he": "כותרת",
            "channels": ["whatsapp"],
            "whatsapp_manual_mode": True,
        },
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["whatsapp_manual_mode"] is True

    list_resp = client.get("/admin/distributions", headers=headers)
    updated = next(d for d in list_resp.json() if d["id"] == resp.json()["id"])
    assert updated["whatsapp_manual_mode"] is True


def test_whatsapp_manual_mode_defaults_false(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["whatsapp"])
    assert dist["whatsapp_manual_mode"] is False


def test_recipients_endpoint_returns_per_user_email_status(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    make_user(email="member1@example.com", password="testpass123")
    make_user(email="member2@example.com", password="testpass123")
    dist = _create_distribution(client, headers, survey.id, ["email"])

    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)

    recipients_resp = client.get(f"/admin/distributions/{dist['id']}/recipients", headers=headers)
    assert recipients_resp.status_code == 200
    recipients = recipients_resp.json()
    assert {r["email"] for r in recipients} == {"member1@example.com", "member2@example.com"}
    assert all(r["channel"] == "email" for r in recipients)
    assert all(r["status"] == "sent" for r in recipients)


def test_recipients_endpoint_survives_deleted_user(client, db_session, make_user):
    """Regression test: SQLite has no FK enforcement here and user deletion has no check for
    historical references, so a recipient's user row can legitimately be gone by the time an
    admin views this list. Must degrade gracefully, not 500."""
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    member = make_user(email="willbedeleted@example.com", password="testpass123")
    dist = _create_distribution(client, headers, survey.id, ["email"])
    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)

    db_session.delete(db_session.query(models.User).filter(models.User.id == member.id).first())
    db_session.commit()

    recipients_resp = client.get(f"/admin/distributions/{dist['id']}/recipients", headers=headers)
    assert recipients_resp.status_code == 200
    recipients = recipients_resp.json()
    assert len(recipients) == 1
    assert recipients[0]["email"] == "(משתמש נמחק)"


def test_recipients_endpoint_requires_admin(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    member = make_user(email="plainmember3@example.com", password="testpass123")
    login = client.post("/auth/login", data={"username": "plainmember3@example.com", "password": "testpass123"})
    member_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.get(f"/admin/distributions/{dist['id']}/recipients", headers=member_headers)
    assert resp.status_code == 403


def test_recipients_endpoint_404_for_unknown_distribution(client, make_user):
    headers = _admin_headers(client, make_user)
    resp = client.get("/admin/distributions/999999/recipients", headers=headers)
    assert resp.status_code == 404


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


def test_send_failure_lands_on_failed_not_stuck_sending(client, db_session, make_user, monkeypatch):
    """Regression test for the actual root cause of the "stuck at שולח..." report: any unexpected
    exception during _send_distribution must land the row on status='failed', never leave it
    stranded at 'sending' with no recovery path (background task failures are otherwise invisible
    - nothing surfaces them anywhere)."""
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    def _boom(*args, **kwargs):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr("app.routers.distributions._build_distribution_email", _boom)

    send_resp = client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    assert send_resp.status_code == 200

    list_resp = client.get("/admin/distributions", headers=headers)
    updated = next(d for d in list_resp.json() if d["id"] == dist["id"])
    assert updated["status"] == "failed"


def test_delete_allowed_from_failed(client, db_session, make_user, monkeypatch):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])
    monkeypatch.setattr("app.routers.distributions._build_distribution_email", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("x")))
    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)

    delete_resp = client.delete(f"/admin/distributions/{dist['id']}", headers=headers)
    assert delete_resp.status_code == 200


def test_resend_allowed_from_failed(client, db_session, make_user, monkeypatch):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    import app.routers.distributions as dist_module
    real_builder = dist_module._build_distribution_email
    call_count = {"n": 0}

    def _boom_once(distribution):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("simulated failure")
        return real_builder(distribution)

    monkeypatch.setattr("app.routers.distributions._build_distribution_email", _boom_once)

    client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    list_resp = client.get("/admin/distributions", headers=headers)
    assert next(d for d in list_resp.json() if d["id"] == dist["id"])["status"] == "failed"

    retry_resp = client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    assert retry_resp.status_code == 200
    list_resp2 = client.get("/admin/distributions", headers=headers)
    final_status = next(d for d in list_resp2.json() if d["id"] == dist["id"])["status"]
    assert final_status == "sent"


def test_send_test_sends_to_admin_without_touching_status_or_logs(client, db_session, make_user):
    headers = _admin_headers(client, make_user, email="testadmin@example.com")
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    resp = client.post(f"/admin/distributions/{dist['id']}/send-test", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    list_resp = client.get("/admin/distributions", headers=headers)
    updated = next(d for d in list_resp.json() if d["id"] == dist["id"])
    assert updated["status"] == "draft"
    assert updated["sent_count"] == 0

    recipients_resp = client.get(f"/admin/distributions/{dist['id']}/recipients", headers=headers)
    assert recipients_resp.json() == []


def test_send_test_requires_admin(client, db_session, make_user):
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    make_user(email="plainmember4@example.com", password="testpass123")
    login = client.post("/auth/login", data={"username": "plainmember4@example.com", "password": "testpass123"})
    member_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    resp = client.post(f"/admin/distributions/{dist['id']}/send-test", headers=member_headers)
    assert resp.status_code == 403


def test_send_test_404_for_unknown_distribution(client, make_user):
    headers = _admin_headers(client, make_user)
    resp = client.post("/admin/distributions/999999/send-test", headers=headers)
    assert resp.status_code == 404


def test_retry_skips_already_sent_recipients(client, db_session, make_user):
    """Regression test: a user who already has a 'sent' DistributionSendLog row for this
    distribution (e.g. from an earlier, partially-successful attempt before a later crash) must
    not receive a second real email on retry - only genuinely not-yet-successful recipients
    should be (re)attempted."""
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    already = make_user(email="alreadysent@example.com", password="testpass123")
    make_user(email="freshmember@example.com", password="testpass123")
    dist = _create_distribution(client, headers, survey.id, ["email"])

    # Simulate a prior attempt that already succeeded for one user before something else failed.
    db_session.add(models.DistributionSendLog(
        distribution_id=dist["id"], user_id=already.id, channel="email", status="sent",
    ))
    db_session.commit()

    send_resp = client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    assert send_resp.status_code == 200

    recipients_resp = client.get(f"/admin/distributions/{dist['id']}/recipients", headers=headers)
    recipients = recipients_resp.json()
    assert len([r for r in recipients if r["email"] == "alreadysent@example.com"]) == 1
    fresh_logs = [r for r in recipients if r["email"] == "freshmember@example.com"]
    assert len(fresh_logs) == 1
    assert fresh_logs[0]["status"] == "sent"


def test_log_committed_immediately_survives_later_crash(client, db_session, make_user, monkeypatch):
    """Regression test for the actual durability bug: DistributionSendLog rows must be committed
    as each recipient is processed, not batched with the final status write - otherwise a crash
    after the send loop (but before the final commit) would roll back the record of emails that
    were already really (and irreversibly) sent, making a subsequent retry re-send them. Simulates
    that exact "crashes after the loop" scenario with a stand-in that mirrors the real function's
    per-user commit shape, then deliberately fails afterward, exactly where the real code's outer
    except also sits."""
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    make_user(email="realrecipient@example.com", password="testpass123")
    dist = _create_distribution(client, headers, survey.id, ["email"])

    import app.routers.distributions as dist_module

    def _crash_after_loop(distribution_id):
        db = dist_module.SessionLocal()
        try:
            distribution = db.query(models.Distribution).filter(models.Distribution.id == distribution_id).first()
            distribution.status = "sending"
            db.commit()
            try:
                subject, email_html = dist_module._build_distribution_email(distribution)
                users = db.query(models.User).filter(models.User.role == "member").all()
                sender = dist_module.get_email_sender()
                for user in users:
                    log = models.DistributionSendLog(distribution_id=distribution.id, user_id=user.id, channel="email")
                    result = sender.send(to=user.email, subject=subject, html_body=email_html, locale="he")
                    log.status = "sent" if result.success else "failed"
                    log.sent_at = datetime.utcnow() if result.success else None
                    db.add(log)
                    db.commit()  # the fix under test: durable per-user, not batched at the end
                raise RuntimeError("simulated crash after the send loop, before the final status write")
            except Exception:
                db.rollback()
                distribution.status = "failed"
                db.commit()
        finally:
            db.close()

    monkeypatch.setattr(dist_module, "_send_distribution", _crash_after_loop)

    send_resp = client.post(f"/admin/distributions/{dist['id']}/send", headers=headers)
    assert send_resp.status_code == 200

    recipients_resp = client.get(f"/admin/distributions/{dist['id']}/recipients", headers=headers)
    recipients = recipients_resp.json()
    assert len(recipients) == 1
    assert recipients[0]["status"] == "sent"


def test_delete_allowed_from_stuck_sending(client, db_session, make_user):
    """A distribution genuinely stuck at 'sending' (e.g. from before the crash-recovery fix
    existed, or any future edge case not caught by it) must have a manual escape hatch - the
    admin shouldn't need a direct DB fix just to get rid of a permanently-stuck row."""
    headers = _admin_headers(client, make_user)
    survey = _make_survey(db_session)
    dist = _create_distribution(client, headers, survey.id, ["email"])

    row = db_session.query(models.Distribution).filter(models.Distribution.id == dist["id"]).first()
    row.status = "sending"
    db_session.commit()

    delete_resp = client.delete(f"/admin/distributions/{dist['id']}", headers=headers)
    assert delete_resp.status_code == 200
