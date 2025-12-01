/**
 * Seed Document Templates Script
 *
 * Creates default document templates for PDF generation.
 * Run with: psql -U mpms_user -d mpms_dev -f seed_document_templates.sql
 */

-- Temporarily disable RLS for data seeding
ALTER TABLE document_templates DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    v_testdoctor_id UUID;
BEGIN
    -- Get test user ID for created_by
    SELECT id INTO v_testdoctor_id FROM users WHERE username = 'testdoctor';

    IF v_testdoctor_id IS NULL THEN
        RAISE NOTICE 'Warning: testdoctor user not found. Templates will be created without created_by.';
    END IF;

    RAISE NOTICE 'Creating document templates...';

    -- ===============================================================================
    -- MEDICAL CERTIFICATE TEMPLATES
    -- ===============================================================================

    -- Italian Medical Certificate (Default)
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'medical_certificate_it',
        'Certificato Medico',
        'Certificato medico standard in italiano per assenze e idoneità',
        'MEDICAL_CERTIFICATE',
        E'<div class="certificate">
    <h1 class="title">CERTIFICATO MEDICO</h1>

    <div class="content">
        <p>Il/La sottoscritto/a <strong>Dr. {{provider.full_name}}</strong>, {{provider.specialization}},
        iscritto all''Ordine dei Medici della provincia di {{clinic.province}} con n. {{provider.license_number}},</p>

        <p class="certifies"><strong>CERTIFICA</strong></p>

        <p>che il/la Sig./Sig.ra <strong>{{patient.full_name}}</strong>,
        nato/a il {{patient.date_of_birth}} a {{patient.birth_place}},
        C.F. {{patient.fiscal_code}},</p>

        <p>{{certificate.content}}</p>

        {% if certificate.prognosis_days %}
        <p>Con prognosi di <strong>{{certificate.prognosis_days}} giorni</strong>
        salvo complicazioni, dal {{certificate.start_date}} al {{certificate.end_date}}.</p>
        {% endif %}

        {% if certificate.notes %}
        <p><em>Note: {{certificate.notes}}</em></p>
        {% endif %}
    </div>

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p>Il Medico</p>
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "certificate", "document"], "patient": ["full_name", "date_of_birth", "fiscal_code"], "provider": ["full_name", "specialization", "license_number"], "clinic": ["city", "province"], "certificate": ["content", "prognosis_days", "start_date", "end_date", "notes"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}} ({{clinic.province}})</p>
        <p>Tel: {{clinic.phone}} | Email: {{clinic.email}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="page-number">Pagina {{page_number}} di {{total_pages}}</p>
    <p class="disclaimer">Questo certificato è valido ai sensi e per gli usi consentiti dalla legge.</p>
</div>',
        E'.certificate { font-family: "Times New Roman", serif; line-height: 1.6; }
.title { text-align: center; margin-bottom: 30px; text-transform: uppercase; }
.content { text-align: justify; margin: 20px 0; }
.certifies { text-align: center; margin: 20px 0; font-size: 1.2em; }
.footer-section { display: flex; justify-content: space-between; margin-top: 50px; }
.signature { text-align: center; }
.signature-line { margin: 30px 0 10px 0; }
.header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 30px; }
.clinic-info { text-align: center; }
.footer { border-top: 1px solid #ccc; padding-top: 10px; font-size: 0.9em; }
.page-number { text-align: right; }
.disclaimer { text-align: center; font-style: italic; color: #666; }',
        'A4', 'PORTRAIT', 25, 20, 20, 20,
        true, true, 'it', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    -- English Medical Certificate
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'medical_certificate_en',
        'Medical Certificate',
        'Standard medical certificate in English for absences and fitness',
        'MEDICAL_CERTIFICATE',
        E'<div class="certificate">
    <h1 class="title">MEDICAL CERTIFICATE</h1>

    <div class="content">
        <p>I, the undersigned <strong>Dr. {{provider.full_name}}</strong>, {{provider.specialization}},
        registered with the Medical Board, License No. {{provider.license_number}},</p>

        <p class="certifies"><strong>HEREBY CERTIFY</strong></p>

        <p>that Mr./Mrs./Ms. <strong>{{patient.full_name}}</strong>,
        born on {{patient.date_of_birth}},</p>

        <p>{{certificate.content}}</p>

        {% if certificate.prognosis_days %}
        <p>With a prognosis of <strong>{{certificate.prognosis_days}} days</strong>
        barring complications, from {{certificate.start_date}} to {{certificate.end_date}}.</p>
        {% endif %}

        {% if certificate.notes %}
        <p><em>Notes: {{certificate.notes}}</em></p>
        {% endif %}
    </div>

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p>Physician</p>
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "certificate", "document"], "patient": ["full_name", "date_of_birth"], "provider": ["full_name", "specialization", "license_number"], "clinic": ["city"], "certificate": ["content", "prognosis_days", "start_date", "end_date", "notes"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}}</p>
        <p>Phone: {{clinic.phone}} | Email: {{clinic.email}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="page-number">Page {{page_number}} of {{total_pages}}</p>
    <p class="disclaimer">This certificate is valid for all purposes permitted by law.</p>
</div>',
        E'.certificate { font-family: "Times New Roman", serif; line-height: 1.6; }
.title { text-align: center; margin-bottom: 30px; text-transform: uppercase; }
.content { text-align: justify; margin: 20px 0; }
.certifies { text-align: center; margin: 20px 0; font-size: 1.2em; }
.footer-section { display: flex; justify-content: space-between; margin-top: 50px; }
.signature { text-align: center; }
.signature-line { margin: 30px 0 10px 0; }
.header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 30px; }
.clinic-info { text-align: center; }
.footer { border-top: 1px solid #ccc; padding-top: 10px; font-size: 0.9em; }
.page-number { text-align: right; }
.disclaimer { text-align: center; font-style: italic; color: #666; }',
        'A4', 'PORTRAIT', 25, 20, 20, 20,
        true, true, 'en', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    -- ===============================================================================
    -- REFERRAL LETTER TEMPLATES
    -- ===============================================================================

    -- Italian Referral Letter (Default)
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'referral_letter_it',
        'Lettera di Referral',
        'Lettera di invio a specialista in italiano',
        'REFERRAL_LETTER',
        E'<div class="referral">
    <h1 class="title">LETTERA DI REFERRAL</h1>

    <div class="recipient">
        <p><strong>Spett.le {{referral.specialist_name}}</strong></p>
        <p>{{referral.specialist_department}}</p>
        <p>{{referral.specialist_address}}</p>
    </div>

    <div class="content">
        <p class="greeting">Egregio/a Collega,</p>

        <p>le invio il/la paziente <strong>{{patient.full_name}}</strong>,
        nato/a il {{patient.date_of_birth}}, C.F. {{patient.fiscal_code}},
        per {{referral.reason}}.</p>

        <h3>Anamnesi</h3>
        <p>{{referral.clinical_history}}</p>

        {% if referral.current_medications %}
        <h3>Terapia in corso</h3>
        <p>{{referral.current_medications}}</p>
        {% endif %}

        {% if referral.allergies %}
        <h3>Allergie note</h3>
        <p>{{referral.allergies}}</p>
        {% endif %}

        <h3>Esame obiettivo</h3>
        <p>{{referral.examination_findings}}</p>

        <h3>Ipotesi diagnostica</h3>
        <p>{{referral.suspected_diagnosis}}</p>

        <h3>Richiesta</h3>
        <p>{{referral.request}}</p>

        <p class="closing">Ringraziando per la cortese collaborazione, porgo distinti saluti.</p>
    </div>

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p>In fede,</p>
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
            <p>{{provider.specialization}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "referral", "document"], "patient": ["full_name", "date_of_birth", "fiscal_code"], "provider": ["full_name", "specialization"], "clinic": ["city"], "referral": ["specialist_name", "reason", "clinical_history", "examination_findings", "suspected_diagnosis", "request"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}} ({{clinic.province}})</p>
        <p>Tel: {{clinic.phone}} | Email: {{clinic.email}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="page-number">Pagina {{page_number}} di {{total_pages}}</p>
</div>',
        E'.referral { font-family: Arial, sans-serif; line-height: 1.6; }
.title { text-align: center; margin-bottom: 30px; }
.recipient { margin: 20px 0; padding: 15px; background-color: #f5f5f5; }
.content { margin: 20px 0; }
.content h3 { color: #333; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
.greeting { margin-bottom: 15px; }
.closing { margin-top: 20px; }
.footer-section { display: flex; justify-content: space-between; margin-top: 40px; }
.signature { text-align: center; }
.signature-line { margin: 30px 0 10px 0; }
.header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
.clinic-info { text-align: center; }
.footer { border-top: 1px solid #ccc; padding-top: 10px; }
.page-number { text-align: right; }',
        'A4', 'PORTRAIT', 25, 20, 20, 20,
        true, true, 'it', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    -- English Referral Letter
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'referral_letter_en',
        'Referral Letter',
        'Specialist referral letter in English',
        'REFERRAL_LETTER',
        E'<div class="referral">
    <h1 class="title">REFERRAL LETTER</h1>

    <div class="recipient">
        <p><strong>{{referral.specialist_name}}</strong></p>
        <p>{{referral.specialist_department}}</p>
        <p>{{referral.specialist_address}}</p>
    </div>

    <div class="content">
        <p class="greeting">Dear Colleague,</p>

        <p>I am referring patient <strong>{{patient.full_name}}</strong>,
        born on {{patient.date_of_birth}},
        for {{referral.reason}}.</p>

        <h3>Medical History</h3>
        <p>{{referral.clinical_history}}</p>

        {% if referral.current_medications %}
        <h3>Current Medications</h3>
        <p>{{referral.current_medications}}</p>
        {% endif %}

        {% if referral.allergies %}
        <h3>Known Allergies</h3>
        <p>{{referral.allergies}}</p>
        {% endif %}

        <h3>Physical Examination</h3>
        <p>{{referral.examination_findings}}</p>

        <h3>Suspected Diagnosis</h3>
        <p>{{referral.suspected_diagnosis}}</p>

        <h3>Request</h3>
        <p>{{referral.request}}</p>

        <p class="closing">Thank you for your assistance.</p>
    </div>

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p>Sincerely,</p>
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
            <p>{{provider.specialization}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "referral", "document"], "patient": ["full_name", "date_of_birth"], "provider": ["full_name", "specialization"], "clinic": ["city"], "referral": ["specialist_name", "reason", "clinical_history", "examination_findings", "suspected_diagnosis", "request"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}}</p>
        <p>Phone: {{clinic.phone}} | Email: {{clinic.email}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="page-number">Page {{page_number}} of {{total_pages}}</p>
</div>',
        E'.referral { font-family: Arial, sans-serif; line-height: 1.6; }
.title { text-align: center; margin-bottom: 30px; }
.recipient { margin: 20px 0; padding: 15px; background-color: #f5f5f5; }
.content { margin: 20px 0; }
.content h3 { color: #333; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
.greeting { margin-bottom: 15px; }
.closing { margin-top: 20px; }
.footer-section { display: flex; justify-content: space-between; margin-top: 40px; }
.signature { text-align: center; }
.signature-line { margin: 30px 0 10px 0; }
.header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
.clinic-info { text-align: center; }
.footer { border-top: 1px solid #ccc; padding-top: 10px; }
.page-number { text-align: right; }',
        'A4', 'PORTRAIT', 25, 20, 20, 20,
        true, true, 'en', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    -- ===============================================================================
    -- LAB REQUEST TEMPLATES
    -- ===============================================================================

    -- Italian Lab Request (Default)
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'lab_request_it',
        'Richiesta Esami di Laboratorio',
        'Modulo di richiesta esami di laboratorio in italiano',
        'LAB_REQUEST',
        E'<div class="lab-request">
    <h1 class="title">RICHIESTA ESAMI DI LABORATORIO</h1>

    <div class="patient-info">
        <table class="info-table">
            <tr>
                <td><strong>Paziente:</strong></td>
                <td>{{patient.full_name}}</td>
                <td><strong>Data di nascita:</strong></td>
                <td>{{patient.date_of_birth}}</td>
            </tr>
            <tr>
                <td><strong>Codice Fiscale:</strong></td>
                <td>{{patient.fiscal_code}}</td>
                <td><strong>Tessera Sanitaria:</strong></td>
                <td>{{patient.health_card_number}}</td>
            </tr>
        </table>
    </div>

    <div class="clinical-info">
        <h3>Informazioni Cliniche</h3>
        <p><strong>Quesito diagnostico:</strong> {{lab.diagnostic_question}}</p>
        {% if lab.clinical_notes %}
        <p><strong>Note cliniche:</strong> {{lab.clinical_notes}}</p>
        {% endif %}
    </div>

    <div class="tests-section">
        <h3>Esami Richiesti</h3>
        <table class="tests-table">
            <thead>
                <tr>
                    <th>Codice</th>
                    <th>Esame</th>
                    <th>Priorità</th>
                </tr>
            </thead>
            <tbody>
                {% for test in lab.tests %}
                <tr>
                    <td>{{test.code}}</td>
                    <td>{{test.name}}</td>
                    <td>{{test.priority}}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    {% if lab.fasting_required %}
    <div class="instructions">
        <p class="warning"><strong>ATTENZIONE:</strong> È richiesto il digiuno da almeno 8-12 ore.</p>
    </div>
    {% endif %}

    {% if lab.special_instructions %}
    <div class="instructions">
        <p><strong>Istruzioni speciali:</strong> {{lab.special_instructions}}</p>
    </div>
    {% endif %}

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p>Il Medico Richiedente</p>
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "lab", "document"], "patient": ["full_name", "date_of_birth", "fiscal_code"], "provider": ["full_name"], "clinic": ["city"], "lab": ["diagnostic_question", "tests"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}} ({{clinic.province}})</p>
        <p>Tel: {{clinic.phone}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="page-number">Pagina {{page_number}} di {{total_pages}}</p>
</div>',
        E'.lab-request { font-family: Arial, sans-serif; line-height: 1.5; }
.title { text-align: center; margin-bottom: 20px; background-color: #f0f0f0; padding: 10px; }
.patient-info { margin: 15px 0; padding: 10px; border: 1px solid #ddd; }
.info-table { width: 100%; border-collapse: collapse; }
.info-table td { padding: 5px; }
.clinical-info { margin: 15px 0; }
.tests-section { margin: 15px 0; }
.tests-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.tests-table th, .tests-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
.tests-table th { background-color: #f5f5f5; }
.instructions { margin: 15px 0; padding: 10px; background-color: #fffbeb; border-left: 4px solid #ffc107; }
.warning { color: #d97706; }
.footer-section { display: flex; justify-content: space-between; margin-top: 30px; }
.signature { text-align: center; }
.signature-line { margin: 20px 0 5px 0; }
.header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
.clinic-info { text-align: center; }
.footer { border-top: 1px solid #ccc; padding-top: 10px; }
.page-number { text-align: right; }',
        'A4', 'PORTRAIT', 20, 15, 15, 15,
        true, true, 'it', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    -- ===============================================================================
    -- VISIT SUMMARY TEMPLATES
    -- ===============================================================================

    -- Italian Visit Summary (Default)
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'visit_summary_it',
        'Riepilogo Visita',
        'Riepilogo della visita medica in italiano',
        'VISIT_SUMMARY',
        E'<div class="visit-summary">
    <h1 class="title">RIEPILOGO VISITA MEDICA</h1>

    <div class="patient-info">
        <h3>Dati Paziente</h3>
        <table class="info-table">
            <tr>
                <td><strong>Nome:</strong></td>
                <td>{{patient.full_name}}</td>
                <td><strong>Data di nascita:</strong></td>
                <td>{{patient.date_of_birth}}</td>
            </tr>
            <tr>
                <td><strong>Codice Fiscale:</strong></td>
                <td>{{patient.fiscal_code}}</td>
                <td><strong>Data visita:</strong></td>
                <td>{{visit.date}}</td>
            </tr>
        </table>
    </div>

    <div class="visit-content">
        <h3>Motivo della Visita</h3>
        <p>{{visit.reason}}</p>

        {% if visit.chief_complaint %}
        <h3>Sintomo Principale</h3>
        <p>{{visit.chief_complaint}}</p>
        {% endif %}

        {% if visit.vital_signs %}
        <h3>Parametri Vitali</h3>
        <table class="vitals-table">
            <tr>
                <td>Pressione Arteriosa:</td>
                <td>{{visit.vital_signs.blood_pressure}} mmHg</td>
                <td>Frequenza Cardiaca:</td>
                <td>{{visit.vital_signs.heart_rate}} bpm</td>
            </tr>
            <tr>
                <td>Temperatura:</td>
                <td>{{visit.vital_signs.temperature}} °C</td>
                <td>SpO2:</td>
                <td>{{visit.vital_signs.spo2}}%</td>
            </tr>
            <tr>
                <td>Peso:</td>
                <td>{{visit.vital_signs.weight}} kg</td>
                <td>Altezza:</td>
                <td>{{visit.vital_signs.height}} cm</td>
            </tr>
        </table>
        {% endif %}

        <h3>Esame Obiettivo</h3>
        <p>{{visit.physical_examination}}</p>

        <h3>Diagnosi</h3>
        <ul class="diagnosis-list">
        {% for diagnosis in visit.diagnoses %}
            <li><strong>{{diagnosis.code}}</strong> - {{diagnosis.description}}</li>
        {% endfor %}
        </ul>

        {% if visit.treatment_plan %}
        <h3>Piano Terapeutico</h3>
        <p>{{visit.treatment_plan}}</p>
        {% endif %}

        {% if visit.prescriptions %}
        <h3>Prescrizioni</h3>
        <table class="prescriptions-table">
            <thead>
                <tr><th>Farmaco</th><th>Posologia</th><th>Durata</th></tr>
            </thead>
            <tbody>
            {% for rx in visit.prescriptions %}
                <tr>
                    <td>{{rx.medication}}</td>
                    <td>{{rx.dosage}}</td>
                    <td>{{rx.duration}}</td>
                </tr>
            {% endfor %}
            </tbody>
        </table>
        {% endif %}

        {% if visit.follow_up %}
        <h3>Follow-up</h3>
        <p>{{visit.follow_up}}</p>
        {% endif %}

        {% if visit.notes %}
        <h3>Note</h3>
        <p>{{visit.notes}}</p>
        {% endif %}
    </div>

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "visit", "document"], "patient": ["full_name", "date_of_birth", "fiscal_code"], "provider": ["full_name"], "clinic": ["city"], "visit": ["date", "reason", "physical_examination", "diagnoses"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}} ({{clinic.province}})</p>
        <p>Tel: {{clinic.phone}} | Email: {{clinic.email}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="page-number">Pagina {{page_number}} di {{total_pages}}</p>
    <p class="confidential">DOCUMENTO RISERVATO - Contiene dati sanitari protetti</p>
</div>',
        E'.visit-summary { font-family: Arial, sans-serif; line-height: 1.5; }
.title { text-align: center; margin-bottom: 20px; color: #333; }
.patient-info { margin: 15px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
.info-table { width: 100%; border-collapse: collapse; }
.info-table td { padding: 5px; }
.visit-content h3 { color: #2563eb; margin-top: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
.vitals-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
.vitals-table td { padding: 8px; border: 1px solid #ddd; }
.diagnosis-list { list-style-type: none; padding-left: 0; }
.diagnosis-list li { padding: 5px 0; border-bottom: 1px solid #eee; }
.prescriptions-table { width: 100%; border-collapse: collapse; }
.prescriptions-table th, .prescriptions-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
.prescriptions-table th { background-color: #f0f0f0; }
.footer-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
.signature { text-align: center; }
.signature-line { margin: 20px 0 5px 0; }
.header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
.clinic-info { text-align: center; }
.footer { border-top: 1px solid #ccc; padding-top: 10px; font-size: 0.85em; }
.page-number { text-align: right; }
.confidential { text-align: center; color: #d97706; font-weight: bold; }',
        'A4', 'PORTRAIT', 20, 20, 15, 15,
        true, true, 'it', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    -- ===============================================================================
    -- PRESCRIPTION TEMPLATES
    -- ===============================================================================

    -- Italian Prescription (Default)
    INSERT INTO document_templates (
        template_key, template_name, description, document_type,
        template_html, template_variables, header_html, footer_html, css_styles,
        page_size, page_orientation, margin_top_mm, margin_bottom_mm, margin_left_mm, margin_right_mm,
        is_active, is_default, language, created_by, updated_by
    ) VALUES (
        'prescription_it',
        'Ricetta Medica',
        'Ricetta medica standard in italiano',
        'PRESCRIPTION',
        E'<div class="prescription">
    <h1 class="title">RICETTA MEDICA</h1>

    <div class="patient-info">
        <p><strong>Paziente:</strong> {{patient.full_name}}</p>
        <p><strong>Data di nascita:</strong> {{patient.date_of_birth}}</p>
        <p><strong>Codice Fiscale:</strong> {{patient.fiscal_code}}</p>
    </div>

    <div class="prescription-content">
        <p class="rx-symbol">℞</p>

        {% for rx in prescription.medications %}
        <div class="medication-item">
            <p class="medication-name"><strong>{{rx.name}}</strong> {{rx.strength}}</p>
            <p class="medication-form">{{rx.form}}</p>
            <p class="medication-dosage">
                <strong>Posologia:</strong> {{rx.dosage}}
            </p>
            <p class="medication-instructions">
                {{rx.instructions}}
            </p>
            {% if rx.quantity %}
            <p class="medication-quantity">
                <strong>Quantità:</strong> {{rx.quantity}} confezioni
            </p>
            {% endif %}
        </div>
        {% endfor %}
    </div>

    {% if prescription.notes %}
    <div class="notes">
        <p><strong>Note:</strong> {{prescription.notes}}</p>
    </div>
    {% endif %}

    <div class="footer-section">
        <div class="date-location">
            <p>{{clinic.city}}, {{document.date}}</p>
        </div>
        <div class="signature">
            <p>Il Medico</p>
            <p class="signature-line">_________________________</p>
            <p>Dr. {{provider.full_name}}</p>
            <p class="license">N. Ordine: {{provider.license_number}}</p>
        </div>
    </div>
</div>',
        '{"required": ["patient", "provider", "clinic", "prescription", "document"], "patient": ["full_name", "date_of_birth", "fiscal_code"], "provider": ["full_name", "license_number"], "clinic": ["city"], "prescription": ["medications"], "document": ["date"]}',
        E'<div class="header">
    <div class="clinic-info">
        <h2>{{clinic.name}}</h2>
        <p>{{clinic.address}} - {{clinic.city}} ({{clinic.province}})</p>
        <p>Tel: {{clinic.phone}}</p>
    </div>
</div>',
        E'<div class="footer">
    <p class="validity">Ricetta valida 30 giorni dalla data di emissione</p>
</div>',
        E'.prescription { font-family: Arial, sans-serif; line-height: 1.5; }
.title { text-align: center; margin-bottom: 15px; }
.patient-info { margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
.patient-info p { margin: 3px 0; }
.prescription-content { margin: 20px 0; }
.rx-symbol { font-size: 2em; color: #2563eb; margin-bottom: 10px; }
.medication-item { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-left: 4px solid #2563eb; }
.medication-name { font-size: 1.1em; margin-bottom: 5px; }
.medication-form { color: #666; font-style: italic; }
.medication-dosage { margin: 8px 0; }
.medication-instructions { margin: 8px 0; color: #333; }
.medication-quantity { margin-top: 8px; }
.notes { margin: 15px 0; padding: 10px; background-color: #fffbeb; border-left: 4px solid #ffc107; }
.footer-section { display: flex; justify-content: space-between; margin-top: 30px; }
.signature { text-align: center; }
.signature-line { margin: 20px 0 5px 0; }
.license { font-size: 0.9em; color: #666; }
.header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
.clinic-info { text-align: center; }
.footer { text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
.validity { font-style: italic; color: #666; }',
        'A4', 'PORTRAIT', 20, 15, 20, 20,
        true, true, 'it', v_testdoctor_id, v_testdoctor_id
    ) ON CONFLICT (template_key) DO NOTHING;

    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'Document Templates Summary:';
    RAISE NOTICE '  Medical Certificate (IT/EN) - 2 templates';
    RAISE NOTICE '  Referral Letter (IT/EN) - 2 templates';
    RAISE NOTICE '  Lab Request (IT) - 1 template';
    RAISE NOTICE '  Visit Summary (IT) - 1 template';
    RAISE NOTICE '  Prescription (IT) - 1 template';
    RAISE NOTICE 'Total: 7 templates created';
    RAISE NOTICE '═══════════════════════════════════════════════════════';

END $$;

-- Re-enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Verify template creation
SELECT template_key, template_name, document_type, language, is_default
FROM document_templates
ORDER BY document_type, language;
