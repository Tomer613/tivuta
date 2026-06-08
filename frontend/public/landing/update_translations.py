import re

with open(r'c:\GitHub\tivuta\frontend\public\landing\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_he_keys = '''
        'sim.current_expenses': 'הוצאות שוטפות נוכחיות:',
        'sim.tivuta_expenses': 'הוצאות שוטפות עם טיבותא:',
        'sim.current_fixed': 'הוצאות קבועות נוכחיות:',
        'sim.tivuta_fixed': 'הוצאות קבועות עם טיבותא:',
        'sim.pct_expense': '(% מסך ההוצאה)',
        'sim.pct_income': '(% מסך ההכנסה)',
        'sim.warning_title': 'שימו לב!',
        'sim.warning_desc': 'כחברי מועדון טיבותא, אתם מרוויחים כפול - גם חוסכים בהוצאות החודשיות, וגם מגדילים את ההכנסה הפנויה.',
        'sim.saving': 'חיסכון: ',
        'sim.hide_pct': '⚙️ להסתרת האחוזים',
        'sim.show_pct': '⚙️ התאמה אישית של האחוזים',
        'sim.hide_breakdown': 'להסתרת הפירוט ▴',
        'sim.show_breakdown': 'לצפייה בפירוט החיסכון ▾',
'''

new_en_keys = '''
        'sim.current_expenses': 'Current expenses:',
        'sim.tivuta_expenses': 'Expenses with Tivuta:',
        'sim.current_fixed': 'Current fixed expenses:',
        'sim.tivuta_fixed': 'Fixed expenses with Tivuta:',
        'sim.pct_expense': '(% of total expense)',
        'sim.pct_income': '(% of total income)',
        'sim.warning_title': 'Please note!',
        'sim.warning_desc': 'As Tivuta club members, you earn double - saving on monthly expenses while increasing disposable income.',
        'sim.saving': 'Savings: ',
        'sim.hide_pct': '⚙️ Hide percentages',
        'sim.show_pct': '⚙️ Customize percentages',
        'sim.hide_breakdown': 'Hide breakdown ▴',
        'sim.show_breakdown': 'View savings breakdown ▾',
'''

new_fr_keys = '''
        'sim.current_expenses': 'Dépenses courantes actuelles :',
        'sim.tivuta_expenses': 'Dépenses courantes avec Tivuta :',
        'sim.current_fixed': 'Dépenses fixes actuelles :',
        'sim.tivuta_fixed': 'Dépenses fixes avec Tivuta :',
        'sim.pct_expense': '(% des dépenses totales)',
        'sim.pct_income': '(% du revenu total)',
        'sim.warning_title': 'Veuillez noter !',
        'sim.warning_desc': 'En tant que membres du club Tivuta, vous gagnez double - économisant sur les dépenses mensuelles tout en augmentant le revenu disponible.',
        'sim.saving': 'Économies : ',
        'sim.hide_pct': '⚙️ Masquer les pourcentages',
        'sim.show_pct': '⚙️ Personnaliser les pourcentages',
        'sim.hide_breakdown': 'Masquer les détails ▴',
        'sim.show_breakdown': 'Voir les détails des économies ▾',
'''

new_yi_keys = '''
        'sim.current_expenses': 'איצטיגע שוטף הוצאות:',
        'sim.tivuta_expenses': 'שוטף הוצאות מיט טיבותא:',
        'sim.current_fixed': 'איצטיגע קבועות הוצאות:',
        'sim.tivuta_fixed': 'קבועות הוצאות מיט טיבותא:',
        'sim.pct_expense': '(% פון סך הכל הוצאה)',
        'sim.pct_income': '(% פון סך הכל הכנסה)',
        'sim.warning_title': 'אכטונג!',
        'sim.warning_desc': 'ווי טיבותא קלוב מיטגלידער, פאַרדינט איר דאָפּלט - שפּאָרנדיק אויף חודשליכע הוצאות און פאַרגרעסערנדיק אייער פרייע הכנסה.',
        'sim.saving': 'שפאָרונגען: ',
        'sim.hide_pct': '⚙️ באהאלט פראצענטן',
        'sim.show_pct': '⚙️ פאסצירט פראצענטן',
        'sim.hide_breakdown': 'באהאלט פרטים ▴',
        'sim.show_breakdown': 'זען שפאָרונגען פרטים ▾',
'''

html = re.sub(r"('footer\.built_by': 'נבנה ועוצב ע\"י',(?:\r?\n)?)", r"\1" + new_he_keys, html)
html = re.sub(r"('footer\.built_by': 'Built and Designed by',(?:\r?\n)?)", r"\1" + new_en_keys, html)
html = re.sub(r"('footer\.built_by': 'Construit et conçu par',(?:\r?\n)?)", r"\1" + new_fr_keys, html)
html = re.sub(r"('footer\.built_by': 'געבויט און דיזיינד דורך',(?:\r?\n)?)", r"\1" + new_yi_keys, html)

with open(r'c:\GitHub\tivuta\frontend\public\landing\index.html', 'w', encoding='utf-8') as f:
    f.write(html)
