# -*- coding: utf-8 -*-
"""
TravelPay — Tam Texniki Arxitektura və Sistem Bələdçisi PDF Generatoru
ReportLab kitabxanası ilə peşəkar A4 formatında hazırlanır.
"""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# 1. Şriftlərin Qeydiyyatı (Azərbaycan hərfləri: ə, ç, ş, ğ, ü, ö, ı dəstəyi ilə)
FONT_DIR = "C:/Windows/Fonts"
pdfmetrics.registerFont(TTFont('Arial', os.path.join(FONT_DIR, 'arial.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Bold', os.path.join(FONT_DIR, 'arialbd.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Italic', os.path.join(FONT_DIR, 'ariali.ttf')))
pdfmetrics.registerFont(TTFont('Arial-BoldItalic', os.path.join(FONT_DIR, 'arialbi.ttf')))

# 2. İki-keçidli Səhifə Nömrələməsi üçün Canvas
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Titul səhifəsində başlıq və nömrə göstərilmir
            return

        self.saveState()
        self.setFont("Arial", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Yuxarı Xətt və Başlıq (Header)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 800, 555, 800)
        self.drawString(40, 805, "TravelPay · Tam Texniki Arxitektura və Sistem Bələdçisi")
        self.drawRightString(555, 805, "Məxfilik Səviyyəsi: Daxili / Texniki")

        # Aşağı Xətt və Səhifə Nömrəsi (Footer)
        self.line(40, 45, 555, 45)
        self.drawString(40, 32, "TravelPay Smart Tourism FinTech Ecosystem — Laravel 11 & React Suite")
        page_str = f"Səhifə {self._pageNumber} / {page_count}"
        self.drawRightString(555, 32, page_str)
        self.restoreState()


def create_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=50
    )

    # Rəng Palitrası
    PRIMARY = colors.HexColor("#0F172A")    # Deep Navy
    ACCENT = colors.HexColor("#0284C7")     # Cyan / Teal Blue
    DARK_TEXT = colors.HexColor("#1E293B")  # Slate 800
    MUTED_TEXT = colors.HexColor("#64748B") # Slate 500
    BORDER_CLR = colors.HexColor("#E2E8F0") # Slate 200
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Slate 50
    HIGHLIGHT = colors.HexColor("#0D9488")  # Teal

    # Stillər
    base_styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Arial-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=0,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Arial',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        alignment=0,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        fontName='Arial-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        fontName='Arial-Bold',
        fontSize=11,
        leading=15,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        fontName='Arial',
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'BodyBold_Custom',
        fontName='Arial-Bold',
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT,
        spaceAfter=5
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        fontName='Arial',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F766E"),
        backColor=colors.HexColor("#F1F5F9"),
        borderPadding=2
    )

    table_header = ParagraphStyle(
        'TableHeader',
        fontName='Arial-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=0
    )

    table_cell = ParagraphStyle(
        'TableCell',
        fontName='Arial',
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_TEXT
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Arial-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_TEXT
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        fontName='Arial-Bold',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0369A1")
    )

    story = []

    # =========================================================================
    # TITUL SƏHİFƏSİ (COVER PAGE)
    # =========================================================================
    story.append(Spacer(1, 40))
    story.append(Paragraph("TRAVELPAY ECOSYSTEM", ParagraphStyle('Badge', fontName='Arial-Bold', fontSize=10, leading=12, textColor=ACCENT, spaceAfter=8)))
    story.append(Paragraph("Tam Texniki Arxitektura, Verilənlər Bazası Sxemi və Funksional Bələdçi", title_style))
    story.append(Paragraph("Ağıllı Turizm və Çoxvalyutalı Rəqəmsal Ödəniş Platforması (Core FinTech)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=20))

    cover_meta = [
        [Paragraph("<b>Layihə Adı:</b>", body_style), Paragraph("TravelPay — Smart Tourism Wallet & Real-Time Fraud Engine", body_style)],
        [Paragraph("<b>Backend Çərçivəsi:</b>", body_style), Paragraph("Laravel 11.x (PHP 8.4 LTS), RESTful API, Sanctum Auth", body_style)],
        [Paragraph("<b>Verilənlər Bazası:</b>", body_style), Paragraph("MySQL 8.0 (Docker container: travelpay_mysql, Port: 3307)", body_style)],
        [Paragraph("<b>Frontend Layları:</b>", body_style), Paragraph("1. Blade Single-Page Application (Vanilla JS + TailwindCSS)<br/>2. React Admin Suite (React 19, TypeScript, Vite)", body_style)],
        [Paragraph("<b>Mühüm Mühərriklər:</b>", body_style), Paragraph("Risk & Fraud Engine (0-100), Double-Entry Ledger, RBAC Matrix, Threat Shield WAF", body_style)],
        [Paragraph("<b>Sənəd Versiyası:</b>", body_style), Paragraph("v2.4 — Tam Ətraflı Texniki Spesifikasiya", body_style)],
        [Paragraph("<b>Tarix:</b>", body_style), Paragraph("2026-cı il Oktyabr", body_style)],
    ]
    meta_table = Table(cover_meta, colWidths=[130, 385])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_CLR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 25))
    story.append(Paragraph("<b>Məzmun Xülasəsi:</b>", h2_style))
    summary_text = (
        "Bu sənəd <b>TravelPay</b> platformasının tam arxitektura quruluşunu, daxili məntiqini, verilənlər bazasındakı bütün "
        "cədvəlləri və onların arasındakı <b>Foreign Key (Xarici Açar)</b> əlaqələrini, backend-də istifadə olunan servisləri, "
        "kontrollerləri, təhlükəsizlik alqoritmlərini və inzibati səlahiyyət (RBAC) modelini ən xırda detalına qədər izah edir. "
        "Sənəd həm proqram təminatı mühəndisləri, həm də layihə rəhbərləri və auditorlar üçün rəsmi istinad mənbəyidir."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(PageBreak())

    # =========================================================================
    # BÖLMƏ 1: ÜMUMİ APP HAQQINDA MƏLUMAT VƏ MƏQSƏD
    # =========================================================================
    story.append(Paragraph("1. Ümumi Tətbiq Haqqında Məlumat və Biznes Məqsədləri", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
    
    p1 = (
        "<b>TravelPay</b> — Azərbaycanda gələn turistlər, yerli vətəndaşlar, merçantlar (hotellər, restoranlar, ticarət obyektləri) "
        "və inzibati orqanlar üçün nəzərdə tutulmuş müasir FinTech və Ağıllı Turizm ekosistemidir. Layihə ölkəyə daxil olan turistlərin "
        "valyuta mübadiləsi çətinliklərini aradan qaldırır, nağdsız ödənişləri təşviq edir və bütün əməliyyatları real vaxt rejimində "
        "kibertəhlükəsizlik və fırıldaqçılıq əleyhinə (Anti-Fraud) filtrasiyadan keçirir."
    )
    story.append(Paragraph(p1, body_style))

    story.append(Paragraph("Əsas Funksional İstiqamətlər:", h2_style))
    features = [
        "<b>1. Çoxvalyutalı Rəqəmsal Pul Kisəsi (Multi-Currency Wallet):</b> İstifadəçilər eyni hesab daxilində AZN, EUR və USD balanslarını saxlayır, anlıq bazar məzənnələri ilə konvertasiya edir və balanslarını artırırlar.",
        "<b>2. Anlıq P2P və Dinamik QR Ödənişlər:</b> Turistlər telefon nömrəsi, email və ya dinamik generasiya olunan QR kod vasitəsilə restoranlarda, taksilərdə və muzeylərdə komissiyasız və dərhal ödəniş edə bilirlər.",
        "<b>3. Ağıllı Turizm Planlayıcısı (Smart Tourism Planner):</b> Səyahətlərin (Trips) yaradılması, kateqoriyalar üzrə xərc büdcələrinin təyini (Nəqliyyat, Qida, Otel, Əyləncə) və xərclərin qrafik təhlili.",
        "<b>4. Virtual Aktivlər (Kripto) ilə Rezervasiya:</b> BTC, ETH, USDT və digər kripto aktivlərin inteqrasiyası. Turistlər kriptovalyuta portfellərindən birbaşa istifadə edərək yerli otel və uçuş biletlərini bron edə bilirlər.",
        "<b>5. Real-Time Fırıldaqçılıq Aşkarlama Mühərriki (Fraud Rules Engine):</b> Hər bir çıxan ödəniş 0–100 risk balı şkalası ilə qiymətləndirilir. Şübhəli əməliyyatlarda 2FA tələb olunur və ya vəsait yoxlama üçün saxlanılır (Hold).",
        "<b>6. İkili Qeydiyyatlı Baş Kitab (Double-Entry General Ledger):</b> Bütün maliyyə hərəkətləri rəsmi mühasibatlıq qaydalarına uyğun olaraq Debit (DR) və Kredit (CR) balans bərabərliyi ilə arxivləşdirilir.",
        "<b>7. Qabaqcıl Rollar və İcazələr (RBAC & Department Governance):</b> Departamentlər, İstifadəçi Qrupları və Xüsusi İcazə Nəzarəti (System Administrator & manage_permissions hüququ).",
        "<b>8. WAF & Kiber Müdafiə Qalxanı (Threat Shield):</b> Qara siyahıya düşmüş IP-lərin avtomatik bloklanması, şübhəli cihazların təyini və dəyişdirilə bilməyən (immutable) audit jurnalları."
    ]
    for feat in features:
        story.append(Paragraph(f"• {feat}", body_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # BÖLMƏ 2: TEXNOLOJİ STEK VƏ İNFRASTRUKTUR
    # =========================================================================
    story.append(Paragraph("2. Texnoloji Stek və Arxitektura Quruluşu", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    stack_data = [
        [Paragraph("Komponent", table_header), Paragraph("İstifadə Olunan Texnologiya", table_header), Paragraph("Məqsəd və Rolu", table_header)],
        [Paragraph("Backend Framework", table_cell_bold), Paragraph("Laravel 11.x (PHP 8.4)", table_cell), Paragraph("REST API arxitekturası, Eloquent ORM, Servis qatı, Middleware və Cron planlayıcı.", table_cell)],
        [Paragraph("Autentifikasiya", table_cell_bold), Paragraph("Laravel Sanctum + 2FA TOTP", table_cell), Paragraph("Token əsaslı təhlükəsiz sessiyalar və Google Authenticator dəstəkli iki-faktorlu təsdiqləmə.", table_cell)],
        [Paragraph("Verilənlər Bazası", table_cell_bold), Paragraph("MySQL 8.0 (Docker Engine)", table_cell), Paragraph("Port 3307 üzərində işləyən, InnoDB mühərrikli, xarici açarlarla (FK) əlaqələndirilmiş əsas baza.", table_cell)],
        [Paragraph("Keş və Sessiya", table_cell_bold), Paragraph("Redis / File Cache", table_cell), Paragraph("Valyuta məzənnələrinin, API sorğu limitlərinin (Rate Limiting) və IP blokların sürətli saxlanması.", table_cell)],
        [Paragraph("Frontend 1 (Müştəri)", table_cell_bold), Paragraph("Blade SPA + Vanilla JS + Tailwind", table_cell), Paragraph("Müştəri və ümumi inzibati idarəetmə üçün sürətli, asinxron SPA interfeysi (travelpay.test).", table_cell)],
        [Paragraph("Frontend 2 (Admin Suite)", table_cell_bold), Paragraph("React 19 + TypeScript + Vite", table_cell), Paragraph("Maliyyə və kibertəhlükəsizlik heyəti üçün xüsusi analitik panel və RBAC idarəetməsi.", table_cell)],
        [Paragraph("Qrafiklər & QR", table_cell_bold), Paragraph("Chart.js & QRCode.js", table_cell), Paragraph("Tranzaksiya həcmi, risk statistikaları və dinamik QR ödəniş kodlarının vizuallaşdırılması.", table_cell)],
        [Paragraph("Təhlükəsizlik Qatı", table_cell_bold), Paragraph("ThreatShield WAF Middleware", table_cell), Paragraph("SQL injection, XSS və DDoS hücumlarının qarşısını alan qoruyucu filtr.", table_cell)],
    ]
    t_stack = Table(stack_data, colWidths=[105, 140, 270])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_stack)
    story.append(PageBreak())

    # =========================================================================
    # BÖLMƏ 3: VERİLƏNLƏR BAZASI SXEMİ VƏ FOREIGN KEY ƏLAQƏLƏRİ
    # =========================================================================
    story.append(Paragraph("3. Verilənlər Bazası Sxemi, Cədvəllər və Foreign Key Əlaqələri", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
    
    schema_intro = (
        "TravelPay verilənlər bazası <b>relyasiyalı (RDBMS)</b> struktura malikdir. Bütün maliyyə, təhlükəsizlik və istifadəçi "
        "məlumatları cədvəllər arasında <b>Foreign Key (Xarici Açar)</b> məhdudiyyətləri ilə möhkəm bağlanmışdır. "
        "Aşağıdakı cədvəldə sistemdəki bütün 23 cədvəl, onların sütunları, hansı cədvələ necə bağlandığı və silinmə "
        "zamanı davranış qaydaları (Cascade, Set Null) tam göstərilmişdir:"
    )
    story.append(Paragraph(schema_intro, body_style))

    db_tables_data = [
        [Paragraph("Cədvəl Adı", table_header), Paragraph("Əsas Sütunlar", table_header), Paragraph("Foreign Key (FK)", table_header), Paragraph("Bağlı Olduğu Cədvəl", table_header), Paragraph("Qayda / Təyinat", table_header)],
        
        # 1. Strukturlar və İcazələr
        [Paragraph("departments", table_cell_code), Paragraph("id, name, code, manager_name, status", table_cell), Paragraph("—", table_cell), Paragraph("—", table_cell), Paragraph("Təşkilati departamentlər (IT, Risk, Maliyyə, Dəstək).", table_cell)],
        [Paragraph("user_groups", table_cell_code), Paragraph("id, name, slug, department_id, is_system", table_cell), Paragraph("department_id", table_cell_bold), Paragraph("departments (id)", table_cell), Paragraph("ON DELETE SET NULL. Qrupun aid olduğu şöbə.", table_cell)],
        [Paragraph("permissions", table_cell_code), Paragraph("id, name, slug, category, description", table_cell), Paragraph("—", table_cell), Paragraph("—", table_cell), Paragraph("Sistem icazələri (manage_permissions və s.).", table_cell)],
        [Paragraph("group_permissions", table_cell_code), Paragraph("id, user_group_id, permission_id", table_cell), Paragraph("user_group_id<br/>permission_id", table_cell_bold), Paragraph("user_groups (id)<br/>permissions (id)", table_cell), Paragraph("ON DELETE CASCADE. Qrupla İcazə arasında Çoxun-Çoxa (N:M) pivot cədvəl.", table_cell)],
        
        # 2. İstifadəçilər və Cüzdanlar
        [Paragraph("users", table_cell_code), Paragraph("id, name, email, role, status, department_id, user_group_id", table_cell), Paragraph("department_id<br/>user_group_id", table_cell_bold), Paragraph("departments (id)<br/>user_groups (id)", table_cell), Paragraph("ON DELETE SET NULL. İstifadəçinin şöbəsi və səlahiyyət qrupu təyinatı.", table_cell)],
        [Paragraph("wallets", table_cell_code), Paragraph("id, user_id, wallet_number, status, daily_limit", table_cell), Paragraph("user_id", table_cell_bold), Paragraph("users (id)", table_cell), Paragraph("ON DELETE CASCADE. Hər istifadəçiyə 1 unikal cüzdan (1:1 münasibət).", table_cell)],
        [Paragraph("wallet_balances", table_cell_code), Paragraph("id, wallet_id, currency_code, balance, reserved_balance", table_cell), Paragraph("wallet_id<br/>currency_code", table_cell_bold), Paragraph("wallets (id)<br/>currencies (code)", table_cell), Paragraph("ON DELETE CASCADE. Hər cüzdanın AZN, EUR, USD valyuta qalıqları.", table_cell)],
        [Paragraph("linked_bank_accounts", table_cell_code), Paragraph("id, user_id, bank_name, iban, is_verified", table_cell), Paragraph("user_id", table_cell_bold), Paragraph("users (id)", table_cell), Paragraph("ON DELETE CASCADE. Açıq Bankçılıqla əlaqələndirilmiş bank hesabları.", table_cell)],
        [Paragraph("virtual_cards", table_cell_code), Paragraph("id, user_id, wallet_id, card_token, masked_pan, status", table_cell), Paragraph("user_id<br/>wallet_id", table_cell_bold), Paragraph("users (id)<br/>wallets (id)", table_cell), Paragraph("ON DELETE CASCADE. Təhlükəsiz virtual ödəniş kartları.", table_cell)],

        # 3. Tranzaksiyalar və Mühasibat
        [Paragraph("transactions", table_cell_code), Paragraph("id, reference_number, user_id, wallet_id, recipient_user_id, amount, status, risk_score", table_cell), Paragraph("user_id<br/>wallet_id<br/>recipient_user_id", table_cell_bold), Paragraph("users (id)<br/>wallets (id)<br/>users (id)", table_cell), Paragraph("Göndərən və qəbul edən istifadəçilərə bağlı əsas maliyyə əməliyyatları.", table_cell)],
        [Paragraph("ledger_accounts", table_cell_code), Paragraph("id, account_number, account_name, type (asset, liability, equity), balance", table_cell), Paragraph("—", table_cell), Paragraph("—", table_cell), Paragraph("Hesablar planı (Müştəri vəsaitləri, komissiya gəlirləri, bank ehtiyatları).", table_cell)],
        [Paragraph("ledger_entries", table_cell_code), Paragraph("id, transaction_id, ledger_account_id, entry_type (debit, credit), amount", table_cell), Paragraph("transaction_id<br/>ledger_account_id", table_cell_bold), Paragraph("transactions (id)<br/>ledger_accounts (id)", table_cell), Paragraph("İkili qeydiyyat qeydləri. Hər tranzaksiyada DR və CR balanslaşır.", table_cell)],

        # 4. Fırıldaqçılıq və Təhlükəsizlik
        [Paragraph("fraud_rules", table_cell_code), Paragraph("id, rule_code, rule_name, rule_type, condition_operator, threshold_value, risk_weight, action", table_cell), Paragraph("—", table_cell), Paragraph("—", table_cell), Paragraph("Avtomatik risk qaydaları (Tezlik, hədd, IP analizi, ölkə filtri).", table_cell)],
        [Paragraph("fraud_alerts", table_cell_code), Paragraph("id, user_id, transaction_id, title, risk_score, severity, status, resolved_by", table_cell), Paragraph("user_id<br/>transaction_id<br/>resolved_by", table_cell_bold), Paragraph("users (id)<br/>transactions (id)<br/>users (id)", table_cell), Paragraph("Şübhəli tranzaksiya insidentləri və onları bağlayan analitik qeydi.", table_cell)],
        [Paragraph("transaction_risk_assessments", table_cell_code), Paragraph("id, transaction_id, risk_score, triggered_rules, recommended_action", table_cell), Paragraph("transaction_id", table_cell_bold), Paragraph("transactions (id)", table_cell), Paragraph("ON DELETE CASCADE. Hər tranzaksiya üçün çıxarılan risk auditi (1:1).", table_cell)],
        [Paragraph("blocked_ips", table_cell_code), Paragraph("id, ip_address, reason, blocked_by, expires_at", table_cell), Paragraph("blocked_by", table_cell_bold), Paragraph("users (id)", table_cell), Paragraph("WAF tərəfindən bloklanmış zərərli IP ünvanları.", table_cell)],
        [Paragraph("security_events", table_cell_code), Paragraph("id, user_id, event_type, ip_address, user_agent, severity", table_cell), Paragraph("user_id", table_cell_bold), Paragraph("users (id)", table_cell), Paragraph("Təhlükəsizlik hadisələri (Uğursuz girişlər, 2FA dəyişməsi və s.).", table_cell)],
        [Paragraph("audit_logs", table_cell_code), Paragraph("id, user_id, action, entity_type, entity_id, old_values, new_values", table_cell), Paragraph("user_id", table_cell_bold), Paragraph("users (id)", table_cell), Paragraph("Dəyişməz inzibati loqlar (JSON formatında əvvəlki və yeni dəyərlər).", table_cell)],

        # 5. Turizm və Kriptovalyuta
        [Paragraph("trips", table_cell_code), Paragraph("id, user_id, title, destination, start_date, end_date, total_budget", table_cell), Paragraph("user_id", table_cell_bold), Paragraph("users (id)", table_cell), Paragraph("ON DELETE CASCADE. Turistin yaratdığı səyahət planı.", table_cell)],
        [Paragraph("travel_budgets", table_cell_code), Paragraph("id, trip_id, category_id, planned_amount", table_cell), Paragraph("trip_id<br/>category_id", table_cell_bold), Paragraph("trips (id)<br/>expense_categories (id)", table_cell), Paragraph("ON DELETE CASCADE. Səyahət üzrə kateqoriya büdcə bölgüsü.", table_cell)],
        [Paragraph("travel_expenses", table_cell_code), Paragraph("id, trip_id, category_id, transaction_id, amount, merchant_name", table_cell), Paragraph("trip_id<br/>category_id<br/>transaction_id", table_cell_bold), Paragraph("trips (id)<br/>expense_categories (id)<br/>transactions (id)", table_cell), Paragraph("Səyahət daxilində faktiki baş vermiş xərclər.", table_cell)],
        [Paragraph("travel_bookings", table_cell_code), Paragraph("id, user_id, booking_type, provider_name, amount, payment_method, crypto_asset_id", table_cell), Paragraph("user_id<br/>crypto_asset_id", table_cell_bold), Paragraph("users (id)<br/>crypto_assets (id)", table_cell), Paragraph("Otel və uçuş rezervasiyaları (Fiat və ya Kripto ödənişli).", table_cell)],
        [Paragraph("crypto_holdings", table_cell_code), Paragraph("id, user_id, crypto_asset_id, balance", table_cell), Paragraph("user_id<br/>crypto_asset_id", table_cell_bold), Paragraph("users (id)<br/>crypto_assets (id)", table_cell), Paragraph("İstifadəçinin sahib olduğu kripto aktiv qalıqları (BTC, ETH, USDT).", table_cell)],
    ]

    t_db = Table(db_tables_data, colWidths=[80, 140, 95, 85, 115])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_db)
    story.append(PageBreak())

    # =========================================================================
    # BÖLMƏ 4: BACKEND SERVİSLƏRİ VƏ ƏSAS FUNKSİYALAR
    # =========================================================================
    story.append(Paragraph("4. Backend Servisləri, Alqoritmlər və Funksional İzah", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    services_info = [
        ("1. FraudDetectionService.php (Fırıldaqçılıq Aşkarlama Mühərriki)",
         "Bu servis hər bir çıxan tranzaksiyanı real vaxt rejimində təhlil edir:\n"
         "• evaluate(Transaction $tx, User $user, Request $req): Əsas qiymətləndirmə metodu. Bütün aktiv fraud_rules qaydalarını oxuyur.\n"
         "• checkVelocity(): İstifadəçinin son 5 və 60 dəqiqədə etdiyi əməliyyatların sayını və məbləğini yoxlayır (Sürətli ardıcıl ödəniş cəhdləri).\n"
         "• checkThreshold(): Qeyri-adi böyük məbləğləri aşkar edir.\n"
         "• calculateRiskScore(): Qaydaların risk çəkilərini toplayaraq 0-100 bal hesablayır.\n"
         "• Qərarlar: Əgər Risk < 30 olarsa 'allow' (icazə verilir); 30-59 olarsa 'step_up_2fa' (2FA tələb olunur); "
         "60-79 olarsa 'flag'; 80 və yuxarı olarsa tranzaksiya 'held_for_review' statusuna keçirilir və inzibatçı təsdiqi gözləyir."),

        ("2. LedgerService.php (İkili Qeydiyyatlı Baş Kitab)",
         "Maliyyə şəffaflığı və balans bərabərliyi üçün nəzərdə tutulmuş mühasibatlıq servisi:\n"
         "• recordTransaction(Transaction $tx): Tranzaksiyanın növünə görə avtomatik 2 və ya daha çox jurnal qeydi yaradır.\n"
         "• recordP2PTransfer(): Göndərənin cüzdanından Debit, Alıcının cüzdanına Kredit qeyd edir.\n"
         "• recordManualEntry(debit_acc, credit_acc, amount): İnzibatçının manual balans korreksiyası daxil etməsi.\n"
         "• assertBalanced(): Baş kitabda Debitlərin cəminin Kreditlərin cəminə tam bərabər olduğunu riyazi olaraq təsdiqləyir (Sum(DR) == Sum(CR))."),

        ("3. WalletService.php & ExchangeRateService.php (Pul Kisəsi və Valyuta)",
         "• transfer(): İstifadəçilər arasında P2P köçürmə. Database lock (lockForUpdate) istifadə edərək eyni anda təkrar çıxarışın (Double Spending) qarşısını alır.\n"
         "• exchange(): AZN, EUR və USD arasında anlıq konvertasiya. Məzənnə marjası tətbiq olunur.\n"
         "• topUp(): Açıq Bankçılıq və ya kart vasitəsilə cüzdan balansının artırılması.\n"
         "• freeze() / unfreeze(): İstifadəçinin şübhəli vəziyyətdə cüzdanını dərhal 'Panic Freeze' rejiminə keçirməsi."),

        ("4. AdminController.php (Bütün İnzibati API Funksionallıqları)",
         "Backend-də /api/v1/admin/ prefiksi ilə işləyən idarəetmə mərkəzi:\n"
         "• departments(), createDepartment(), updateDepartment(), deleteDepartment(): Şöbələrin CRUD idarəsi.\n"
         "• userGroups(), createUserGroup(), updateUserGroup(), deleteUserGroup(): İstifadəçi qruplarının idarəsi.\n"
         "• updateGroupPermissions(): Yalnız System Administrator və ya 'manage_permissions' hüququ olanlar tərəfindən icazələrin təyini.\n"
         "• users(), createUser(), updateUserStatus(): Yeni istifadəçi yaratmaq, departament/qrup təyin etmək, balansı dondurmaq.\n"
         "• approveTransaction(), rejectTransaction(): Hold-a düşmüş riskli ödənişləri təsdiqləmək və ya vəsaiti geri qaytarmaq.\n"
         "• creditWallet(): Müştəri cüzdanına manual kredit/depozit vermək.\n"
         "• blockIp(), unblockIp(): Zərərli hücum edən IP-ləri WAF müdafiəsinə əlavə etmək."),

        ("5. ThreatShield.php (WAF Middleware) & AuditLogService.php",
         "• ThreatShield: Hər daxil olan HTTP sorğusunun IP-sini blocked_ips cədvəli ilə yoxlayır, şübhəli User-Agent və SQL injection simvollarını dərhal 403 Forbidden ilə kəsir.\n"
         "• AuditLogService: İnzibatçıların etdiyi hər bir dəyişikliyi (köhnə və yeni qiymətlər, IP, tarix) dəyişməz audit bazasına yazır.")
    ]

    for title, desc in services_info:
        story.append(Paragraph(title, h2_style))
        for line in desc.split('\n'):
            story.append(Paragraph(line, body_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # =========================================================================
    # BÖLMƏ 5: RBAC VƏ İCAZƏLƏRİN İDARƏETMƏ MODELİ
    # =========================================================================
    story.append(Paragraph("5. Rol Əsaslı İcazələr (RBAC) və Səlahiyyət Arxitekturası", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    rbac_p = (
        "TravelPay təhlükəsizlik modelində ən vacib qaydalardan biri <b>səlahiyyətlərin ayrılması (Separation of Duties)</b> "
        "prinsipidir. Sistemdə icazələrin necə paylandığı aşağıdakı ciddi qaydalarla tənzimlənir:"
    )
    story.append(Paragraph(rbac_p, body_style))

    rbac_rules = [
        "<b>1. Sistem Administratoru (System Administrator):</b> Sistemdəki ən ali inzibati səlahiyyətli şəxsdir. Avtomatik olaraq bütün icazələrə malikdir və bütün qrupların səlahiyyətlərini tənzimləmək hüququ var.",
        "<b>2. Xüsusi manage_permissions Səlahiyyəti:</b> Layihənin ən mühüm tələblərindən biri kimi yaradılmış xüsusi icazədir. Bu icazə adi bir qrupa və ya istifadəçiyə verildikdə, həmin istifadəçi Sistem Administratoru olmasa belə, <b>digər qruplara icazələr verə və dəyişə bilmək hüququ qazanır</b>.",
        "<b>3. Qorunan Giriş Filtrasiyası:</b> Əgər daxil olmuş istifadəçi Sistem Administratoru deyilsə və onun qrupunda 'manage_permissions' icazəsi YOXDURSA, sistem icazələri dəyişməyə icazə vermir, yalnız oxu rejimini (Read-Only) aktivləşdirir və ya təhlükəsizlik baxımından qoruyucu Dashboard-a yönləndirir.",
        "<b>4. Departament Bağlantısı:</b> Hər bir istifadəçi mütləq bir departamentə (Şöbəyə) və həmin departamentə aid olan İstifadəçi Qrupuna təyin edilə bilər. Bu, korporativ idarəetmədə hər əməkdaşın məsuliyyət zonasını müəyyən edir."
    ]
    for r in rbac_rules:
        story.append(Paragraph(f"• {r}", body_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # BÖLMƏ 6: ƏSAS API MARŞRUTLARI (ENDPOINTS)
    # =========================================================================
    story.append(Paragraph("6. Əsas API Endpoint-ləri və Giriş Nöqtələri", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    endpoints_data = [
        [Paragraph("Metod", table_header), Paragraph("API Endpoint", table_header), Paragraph("Giriş Səlahiyyəti", table_header), Paragraph("Funksional Təyinatı", table_header)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/auth/login", table_cell_code), Paragraph("Açıq (Public)", table_cell), Paragraph("İstifadəçi girişi, 2FA yoxlanışı və Sanctum token verilməsi.", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/v1/auth/me", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("Giriş etmiş istifadəçinin profili, icazələri və cüzdan məlumatları.", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/v1/wallet/summary", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("Çoxvalyutalı balanslar (AZN, EUR, USD) və son tranzaksiyalar.", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/wallet/transfer", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("Digər istifadəçiyə P2P pul köçürməsi (Fraud Engine tərəfindən yoxlanılır).", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/wallet/exchange", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("Balans daxilində anlıq valyuta konvertasiyası.", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/payments/qr/{token}/pay", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("Məkanda və ya restoranda dinamik QR kodla ödəniş edilməsi.", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/v1/trips", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("İstifadəçinin səyahət planları, büdcələri və kateqoriya xərcləri.", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/bookings", table_cell_code), Paragraph("Auth Token", table_cell), Paragraph("Otel və ya uçuş rezervasiyası (Fiat və ya Kripto ödənişli).", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/v1/admin/dashboard", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("Maliyyə balansı, dövriyyə statistikası, risk və WAF siqnalları.", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/v1/admin/departments", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("Departamentlərin siyahısı və yenisinin yaradılması.", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/v1/admin/user-groups", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("İstifadəçi qruplarının siyahısı və yeni qrup açılması.", table_cell)],
        [Paragraph("PUT", table_cell_bold), Paragraph("/api/v1/admin/user-groups/{id}/permissions", table_cell_code), Paragraph("SysAdmin / manage_perms", table_cell), Paragraph("Qrupa icazələrin təyin edilməsi və yenilənməsi.", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/v1/admin/users", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("İstifadəçilərin idarəsi və sistemə yeni istifadəçi əlavə edilməsi.", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/admin/transactions/{id}/approve", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("Risk səbəbilə Hold-a düşmüş ödənişin təsdiq edilməsi.", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/admin/ledger/entries", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("Baş kitaba manual ikili mühasibat qeydinin daxil edilməsi.", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/v1/admin/fraud-rules", table_cell_code), Paragraph("Admin / Perms", table_cell), Paragraph("Yeni kiber təhlükəsizlik və risk qaydasının əlavə edilməsi.", table_cell)],
    ]
    t_end = Table(endpoints_data, colWidths=[65, 175, 95, 180])
    t_end.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_end)

    # Qurucu
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF SUCCESSFULLY GENERATED AT: {output_path}")

if __name__ == '__main__':
    target = os.path.abspath(r"c:\Users\MSI\OneDrive - Khazar University\Desktop\Travel Pay\TravelPay_Sistem_Arxitekturasi_ve_Texniki_Rehber.pdf")
    create_pdf(target)
