from typing import List, Optional, Set
from backend.app.ai.nlp.base import ExtractedSymptom

class HealthResponseGenerator:
    """
    Clinically calibrated, culturally sensitive, symptom-specific health guidance engine.
    Adheres strictly to WHO IMCI & ICMR clinical protocols:
    1. What the patient should do now (immediate supportive steps)
    2. Appropriate level/timeframe of healthcare (Emergency 108 / Hospital / PHC / Home Care)
    3. Safe non-pharmacological self-care (complaint-specific, strictly omitted for emergencies)
    4. Warning signs requiring urgent/emergency medical escalation
    5. Follow-up instructions

    Strict Safety Boundaries:
    - ZERO drug names, dosages, or prescriptions.
    - NO disease diagnoses (symptom-based guidance & care navigation only).
    - Emergency Level 4 cases prioritize urgent emergency transport (108) with zero delay.
    - True multilingual support across English (en), Hindi (hi), and Hinglish (hinglish).
    """

    def generate_response(
        self,
        triage_level: int,
        protocol_rule_id: str,
        symptoms: List[ExtractedSymptom],
        patient_facing_summary: Optional[str] = None,
        language: str = "hinglish",
        age_group: Optional[str] = "adult",
        is_pregnant: bool = False,
        body_locations: Optional[List[str]] = None
    ) -> str:
        active = [s for s in symptoms if not s.is_negated]
        sym_names: Set[str] = {s.name for s in active}
        loc_str = ", ".join(body_locations) if body_locations else ""

        # Extract temporal and severity context from primary active symptoms
        duration_text = None
        duration_val = None
        onset = "gradual"
        max_severity = "moderate"

        for s in active:
            if s.duration_text and not duration_text:
                duration_text = s.duration_text
            if s.duration_val is not None and duration_val is None:
                duration_val = s.duration_val
            if s.onset == "sudden":
                onset = "sudden"
            if s.severity == "severe":
                max_severity = "severe"

        lang = language.lower()
        if lang not in ["en", "hi", "hinglish"]:
            lang = "hi" if "hi" in lang else "en"

        # ─────────────────────────────────────────────────────────────
        # 1. EMERGENCY / RED FLAG CASES (LEVEL 4)
        # ─────────────────────────────────────────────────────────────
        if (
            triage_level == 4 
            or protocol_rule_id.startswith("EMERG-") 
            or "chest_pain" in sym_names 
            or "dyspnea" in sym_names 
            or "unconsciousness" in sym_names
        ):
            if "unconsciousness" in sym_names:
                if lang == "en":
                    return (
                        "Emergency Medical Alert! Loss of consciousness or severe unresponsiveness is a critical emergency. "
                        "Call 108 immediately for an ambulance. "
                        "Turn the person gently onto their side in the recovery position to keep their breathing airway clear. "
                        "Do not try to feed them or give water, and do not leave them unattended while waiting for emergency responders."
                    )
                elif lang == "hinglish":
                    return (
                        "Emergency Alert! Behoshi ya severe unresponsiveness ek critical emergency hai. "
                        "Turant 108 par call karke ambulance bulayein. "
                        "Mareez ko aaram se karwat (side) ke bal litayein taaki saans lene ka rasta khula rahe. "
                        "Mukh mein paani ya koi cheez bilkul na daalein aur ambulance aane tak mareez ke paas rahein."
                    )
                else: # Hindi
                    return (
                        "आपातकालीन चेतावनी! बेहोशी या अचेत अवस्था एक अत्यंत गंभीर आपातकाल है। "
                        "तुरंत 108 नंबर पर कॉल करके एम्बुलेंस बुलाएं। "
                        "मरीज को करवट के बल (रिकवरी पोजीशन में) लिटाएं ताकि सांस की नली खुली रहे। "
                        "मरीज के मुंह में पानी या कोई चीज बिल्कुल न डालें और एम्बुलेंस आने तक मरीज के पास रहें।"
                    )

            # Chest Pain / Dyspnea / Severe Respiratory Distress
            if lang == "en":
                return (
                    "Emergency Medical Alert! Your symptoms indicate a critical situation requiring immediate emergency care. "
                    "Please call 108 immediately for an ambulance or proceed to the nearest hospital emergency department without delay. "
                    "Sit in a comfortable upright propped-up position, loosen tight clothing around your neck and chest, and avoid any physical exertion. "
                    "Do not wait at home or delay transport."
                )
            elif lang == "hinglish":
                return (
                    "Emergency Alert! Aapke bataye gaye lakshan gambhir ho sakte hain aur turant emergency treatment ki zaroorat hai. "
                    "Kripya bina kisi deri ke 108 par call karke ambulance bulayein ya nearest hospital ke emergency ward mein jayein. "
                    "Aaram se baith jayein, gale aur seene ke kapde dheele karein, aur koi physical exertion na karein. "
                    "Ghar par bilkul wait na karein."
                )
            else: # Hindi
                return (
                    "आपातकालीन चेतावनी! आपके बताए गए लक्षण अत्यंत गंभीर हो सकते हैं और तत्काल चिकित्सीय सहायता की आवश्यकता है। "
                    "कृपया बिना किसी देरी के तुरंत 108 नंबर पर एम्बुलेंस बुलाएं या नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं। "
                    "आराम से बैठें, सीने और गले के कपड़े ढीले रखें और किसी भी प्रकार की शारीरिक मेहनत न करें। "
                    "घर पर समय व्यर्थ न करें।"
                )

        # ─────────────────────────────────────────────────────────────
        # 2. MATERNAL HEALTH IN PREGNANCY (LEVEL 3)
        # ─────────────────────────────────────────────────────────────
        if is_pregnant and active:
            if lang == "en":
                return (
                    "Obstetric Medical Advisory: During pregnancy, these symptoms require prompt clinical evaluation today. "
                    "Please visit your nearest Community Health Centre (CHC) or District Hospital maternity unit without delay. "
                    "Rest comfortably on your left side to improve blood flow, stay well hydrated with clean water, and avoid any physical strain. "
                    "Warning: If you notice vaginal bleeding, severe lower abdominal cramping, high fever, sudden facial swelling, or decreased baby movement, seek emergency hospital care immediately."
                )
            elif lang == "hinglish":
                return (
                    "Garbhavastha Swasthya Salah: Pregnancy ke dauran ye lakshan aaj hi doctor se check karwane zaroori hain. "
                    "Bina deri kiye apne nearby Community Health Centre (CHC) ya District Hospital ke maternity department jayein. "
                    "Left side (bayein karwat) hokar aaram karein, saaf paani peete rahein, aur koi bhari kaam na karein. "
                    "Dhyan dein: Agar bleeding ho, pet ke nichle hisse mein tez marod ho, tez bukhar aaye, ya baby movement kam mehsoos ho, toh turant emergency hospital jayein."
                )
            else: # Hindi
                return (
                    "गर्भावस्था स्वास्थ्य परामर्श: गर्भावस्था के दौरान इन लक्षणों की आज ही डॉक्टरी जांच कराना आवश्यक है। "
                    "कृपया बिना देर किए नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल के प्रसूति विभाग में जाएं। "
                    "बाईं करवट लेकर आराम करें, पर्याप्त साफ पानी पिएं और कोई भारी काम न करें। "
                    "सावधानी: यदि रक्तस्राव हो, पेट में तेज मरोड़ या दर्द हो, तेज बुखार आए, या शिशु की हलचल कम लगे, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 3. PEDIATRIC RISK / DEHYDRATION (LEVEL 3)
        # ─────────────────────────────────────────────────────────────
        if age_group == "child" and (sym_names.intersection({"vomiting", "diarrhea"}) or ("fever" in sym_names and duration_val and duration_val >= 3)):
            if lang == "en":
                return (
                    "Pediatric Health Guidance: For children experiencing persistent symptoms or fluid loss, clinical evaluation is required today. "
                    "Please take your child to the nearest Community Health Centre (CHC) or District Hospital. "
                    "Administer Oral Rehydration Solution (ORS) or clean boiled water frequently in small sips (1 to 2 spoonfuls every few minutes) to prevent dehydration. "
                    "Warning: If the child becomes unusually drowsy, has dry lips and sunken eyes, passes no urine for over 6 hours, or cannot retain any liquids, go to the emergency room immediately."
                )
            elif lang == "hinglish":
                return (
                    "Bachhon ki Dekhbhal Salah: Bachhe mein lagatar lakshan ya paani ki kami ke risk ko dekhte hue aaj hi doctor ko dikhana zaroori hai. "
                    "Kripya bachhe ko nearby Community Health Centre (CHC) ya District Hospital le jayein. "
                    "Dehydration se bachne ke liye ORS (jeevan rakshak ghol) ya ubla hua saaf paani thoda-thoda karke (1-2 chammach har kuch minute mein) pilate rahein. "
                    "Dhyan dein: Agar bachha behad sust ho jaye, aankhein dhasne lagein, 6 ghante se peshab na kare ya ulti na ruke, toh turant hospital emergency jayein."
                )
            else: # Hindi
                return (
                    "बाल स्वास्थ्य परामर्श: बच्चे में लगातार लक्षण और पानी की कमी (डिहाइड्रेशन) के जोखिम को देखते हुए आज ही डॉक्टर को दिखाना आवश्यक है। "
                    "कृपया बच्चे को नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल ले जाएं। "
                    "ओआरएस (ORS घोल) या उबला हुआ साफ पानी थोड़ी-थोड़ी देर में चम्मच से पिलाते रहें ताकि शरीर में पानी की कमी न हो। "
                    "सावधानी: यदि बच्चा अत्यधिक सुस्त हो, आंखें धंसी लगें, 6 घंटे से पेशाब न किया हो या उल्टी बिल्कुल न रुके, तो तुरंत आपातकालीन अस्पताल ले जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 4. ACUTE NEUROLOGICAL / SUDDEN SENSORY / DIZZINESS (LEVEL 3)
        # ─────────────────────────────────────────────────────────────
        if (
            protocol_rule_id == "HOSP-NEURO-001" 
            or (sym_names.intersection({"dizziness", "blurred_vision"}) and onset == "sudden")
            or (sym_names.intersection({"dizziness", "blurred_vision"}) and max_severity == "severe")
        ):
            if lang == "en":
                return (
                    "Urgent Medical Guidance: Sudden dizziness or visual changes require a clinical evaluation today. "
                    "Please visit your nearest Community Health Centre (CHC) or District Hospital for an examination. "
                    "Immediately sit or lie down flat in a safe position to prevent falls, keep your head supported, drink clean water, and avoid walking or driving alone. "
                    "Warning: If you develop sudden facial drooping, weakness or numbness in an arm or leg, difficulty speaking, or severe confusion, seek emergency care immediately."
                )
            elif lang == "hinglish":
                return (
                    "Urgent Medical Salah: Achanak chakkar aana ya aankhon ke aage dhundhlapan aana aaj hi doctor se check karwana zaroori hai. "
                    "Kripya aaj hi apne nearby Community Health Centre (CHC) ya District Hospital jakar jaanch karwayein. "
                    "Girne se bachne ke liye turant safe jagah par baith ya let jayein, sir ko support dein, paani piyein, aur akele walk ya drive bilkul na karein. "
                    "Dhyan dein: Agar chehre par tedhapan, haath-pair mein kamzori ya sunnpan, ya bolne mein ladkhadahat ho, toh turant emergency hospital jayein."
                )
            else: # Hindi
                return (
                    "आवश्यक चिकित्सीय परामर्श: अचानक चक्कर आना या आंखों के सामने धुंधलापन आना आज ही डॉक्टर से जांच की मांग करता है। "
                    "कृपया आज ही अपने नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल जाकर जांच करवाएं। "
                    "चोट या गिरने से बचने के लिए तुरंत सुरक्षित स्थान पर बैठ या लेट जाएं, सिर को सहारा दें, पानी पिएं और अकेले बाहर न निकलें। "
                    "सावधानी: यदि चेहरे में कमजोरी या टेढ़ापन, हाथ-पैर में सुन्नपन, या बोलने में कठिनाई महसूस हो, तो तुरंत आपातकालीन सेवा 108 पर संपर्क करें।"
                )

        # ─────────────────────────────────────────────────────────────
        # 5. OPHTHALMIC / EYE IRRITATION / BLURRED VISION
        # ─────────────────────────────────────────────────────────────
        if sym_names.intersection({"blurred_vision", "eye_irritation", "eye_pain", "watery_eyes"}):
            if lang == "en":
                return (
                    "For your vision discomfort and eye irritation, an examination at your nearest Primary Health Centre (PHC) within 24 to 48 hours is recommended. "
                    "Rest your eyes in a comfortably lit room, avoid staring at mobile or computer screens, avoid rubbing your eyes with unwashed hands, and rinse gently with clean drinking water if exposed to dust. "
                    "Warning: If you experience sudden vision loss, severe eye pain, flashes of light, or severe headache with nausea, seek emergency hospital care immediately."
                )
            elif lang == "hinglish":
                return (
                    "Aankhon mein jalan, paani aane ya dhundhlapan ke liye agle 24 se 48 ghante mein nearby Primary Health Centre (PHC) jakar aankhon ki jaanch karwaein. "
                    "Aankhon ko aaram dein, screen dekhne se bachein, gande haathon se aankhein na ragadein, aur dhool lagne par saaf peene ke paani se dhoyein. "
                    "Dhyan dein: Agar achanak dikhna band ho jaye, aankhon mein tez dard ho ya tez sir dard ke sath ulti lage, toh turant hospital doctor ko dikhayein."
                )
            else: # Hindi
                return (
                    "आंखों में जलन, पानी आने या धुंधलेपन की समस्या के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर आंखों की जांच करवाएं। "
                    "आंखों को भरपूर आराम दें, मोबाइल या टीवी स्क्रीन से बचें, गंदे हाथों से आंखें न मलें और धूल जाने पर साफ पानी से धोएं। "
                    "सावधानी: यदि अचानक दिखना बंद हो जाए, आंखों में तेज असहनीय दर्द हो, या सिर दर्द के साथ उल्टी हो, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 6. HEADACHE / NON-ACUTE DIZZINESS
        # ─────────────────────────────────────────────────────────────
        if sym_names.intersection({"headache", "dizziness"}):
            loc_detail = "head and temples" if "head" in loc_str else "head"
            if lang == "en":
                return (
                    f"For your {loc_detail} discomfort and headache, a clinical review at your local Primary Health Centre (PHC) within 24 to 48 hours is recommended. "
                    "Rest in a quiet, dimly lit, well-ventilated room, stay well hydrated with clean water, avoid staring at mobile or television screens, and avoid sudden rapid head movements. "
                    "Warning: If you experience a sudden explosive 'thunderclap' headache, stiff neck with high fever, vomiting, or weakness on one side of your body, go to the hospital emergency department immediately. "
                    "If your headache continues past 48 hours without relief, consult a doctor."
                )
            elif lang == "hinglish":
                return (
                    "Sir dard aur chakkar ke liye agle 24 se 48 ghante mein apne nearby Primary Health Centre (PHC) jakar doctor se check-up karwaein. "
                    "Shaant, kam roshni wale aur havadar kamre mein aaram karein, khoob saaf paani piyein, mobile ya screen dekhne se bachein, aur achanak tezi se na uthein. "
                    "Dhyan dein: Agar achanak asahaniya tez jhatke jaisa sir dard ho, gardan mein jakdan ke sath bukhar ho, ya shareer ke kisi hisse mein kamzori lage, toh turant hospital jayein. "
                    "Agar 48 ghante mein aaram na mile toh doctor ko zaroor dikhayein."
                )
            else: # Hindi
                return (
                    "सिर दर्द और चक्कर की समस्या के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से जांच करवाएं। "
                    "शांत, कम रोशनी वाले और हवादार कमरे में आराम करें, पर्याप्त साफ पानी पिएं, मोबाइल या टीवी स्क्रीन से दूर रहें और अचानक तेजी से न उठें। "
                    "सावधानी: यदि अचानक असहनीय तीव्र सिर दर्द उठे, गर्दन में जकड़न के साथ बुखार हो, या शरीर के किसी हिस्से में कमजोरी महसूस हो, तो तुरंत अस्पताल जाएं। "
                    "यदि 48 घंटों में राहत न मिले तो डॉक्टर से परामर्श लें।"
                )

        # ─────────────────────────────────────────────────────────────
        # 7. STOMACH / ABDOMINAL PAIN (GASTROINTESTINAL)
        # ─────────────────────────────────────────────────────────────
        if "abdominal_pain" in sym_names or "stomach_pain" in sym_names or protocol_rule_id == "PHC-ABD-001":
            loc_mention = f"in your {loc_str}" if loc_str and ("abdomen" in loc_str or "stomach" in loc_str) else "in your stomach"
            
            if lang == "en":
                return (
                    f"For your pain {loc_mention}, we recommend visiting your nearest Primary Health Centre (PHC) within the next 24 to 48 hours for an abdominal examination. "
                    "Rest comfortably, consume small bland meals such as plain rice porridge or khichdi, avoid oily, spicy, fried foods and heavy dairy, and take frequent small sips of clean warm water. "
                    "Avoid applying strong pressure or forceful massage over the painful area. "
                    "Warning: If you develop high fever, continuous severe vomiting, blood in your stool or vomit, or sharp unbearable worsening pain, proceed to a hospital emergency department immediately."
                )
            elif lang == "hinglish":
                return (
                    "Stomach pain ke liye hamari advice hai ki agle 24 se 48 ghante ke andar apne nearby Primary Health Centre (PHC) jakar doctor se check-up karwaein. "
                    "Tab tak aaram karein, halka aur supaachya khana jaise saadhi khichdi ya dalia lein, tel-masale aur fried khane se bachein, aur gunguna saaf paani thoda-thoda karke peete rahein. "
                    "Pet par koi tezi se dabaav ya malish na karein. "
                    "Dhyan dein: Agar tez bukhar aaye, lagatar ulti ho, dast/ulti mein khoon dikhe, ya pet mein asahaniya tez dard uthe, toh turant hospital emergency jayein."
                )
            else: # Hindi
                return (
                    "पेट दर्द की समस्या के लिए सलाह है कि आप अगले 24 से 48 घंटों में अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से पेट की जांच करवाएं। "
                    "तब तक भरपूर आराम करें, सुपाच्य और सादा भोजन जैसे सादी खिचड़ी या दलिया लें, मिर्च-मसाले व तले-भुने खाने से बचें और घूंट-घूंट करके गुनगुना साफ पानी पीते रहें। "
                    "पेट पर किसी भी प्रकार का अत्यधिक दबाव या मालिश न करें। "
                    "सावधानी: यदि तेज बुखार हो, लगातार उल्टी हो, मल या उल्टी में खून दिखे, या पेट में अत्यधिक असहनीय दर्द उठे, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 8. VOMITING & DIARRHEA (GASTROINTESTINAL / FLUID LOSS)
        # ─────────────────────────────────────────────────────────────
        if sym_names.intersection({"vomiting", "diarrhea"}) or protocol_rule_id in ["PHC-GI-001", "HOSP-PED-001"]:
            if lang == "en":
                return (
                    "For vomiting and loose motions, the primary priority is preventing dehydration. "
                    "We advise visiting your nearest Primary Health Centre (PHC) within 24 hours for evaluation. "
                    "Take Oral Rehydration Solution (ORS) or clean water with a pinch of salt and sugar in small, frequent sips (1 to 2 spoonfuls every few minutes) rather than large gulps, and eat bland foods like banana or rice once vomiting subsides. "
                    "Warning: If you cannot keep fluids down for over 12 hours, feel severe dizziness when standing, pass dark/bloody stools, or produce no urine, seek emergency hospital care immediately."
                )
            elif lang == "hinglish":
                return (
                    "Ulti aur dast ke samay shareer mein paani ki kami (dehydration) se bachna sabse zaroori hai. "
                    "Agle 24 ghante ke andar nearby Primary Health Centre (PHC) jakar doctor ko dikhayein. "
                    "ORS (jeevan rakshak ghol) ya namak-cheeni ka paani thoda-thoda karke baar-baar piyein, aur ulti rukne par khichdi ya kela khayein. "
                    "Dhyan dein: Agar bilkul paani na pache, khade hone par chakkar aaye, dast/ulti mein khoon ho ya peshab aana band ho jaye, toh turant emergency hospital jayein."
                )
            else: # Hindi
                return (
                    "उल्टी और दस्त की स्थिति में शरीर में पानी की कमी (डिहाइड्रेशन) से बचाव सबसे महत्वपूर्ण है। "
                    "अगले 24 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से जांच करवाएं। "
                    "ओआरएस (ORS घोल) या नमक-पानी का घोल थोड़ी-थोड़ी देर में घूंट-घूंट करके पिएं और स्थिति संभलने पर हल्का भोजन जैसे केला या खिचड़ी लें। "
                    "सावधानी: यदि पानी बिल्कुल न पचे, खड़े होने पर चक्कर आए, मल में खून दिखे या पेशाब आना बंद हो, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 9. BURNING URINATION / DYSURIA (GENITOURINARY)
        # ─────────────────────────────────────────────────────────────
        if "burning_urination" in sym_names or "painful_urination" in sym_names or protocol_rule_id == "PHC-UTI-001":
            if lang == "en":
                return (
                    "For your urinary burning and discomfort, we advise visiting your nearest Primary Health Centre (PHC) within 24 to 48 hours for a routine urine evaluation. "
                    "Drink plenty of clean water (at least 8 to 10 glasses daily) to help flush your urinary system, maintain good personal genital hygiene, and avoid holding urine when you feel the urge. "
                    "Avoid synthetic tight clothing and spicy foods that can irritate the bladder. "
                    "Warning: If you notice blood in your urine, develop high fever with shivering chills, or experience severe lower back or flank pain, visit a hospital without delay."
                )
            elif lang == "hinglish":
                return (
                    "Urine mein jalan aur takleef ke liye agle 24 se 48 ghante ke andar apne nearby Primary Health Centre (PHC) jakar routine urine test karwaein. "
                    "Din bhar mein 8 se 10 glass saaf paani piyein taaki urinary tract clean rahe, personal hygiene ka dhyan rakhein aur peshab ko bilkul na rokein. "
                    "Dheele sooti kapde pehnein aur zyada mirch-masale wale khane se bachein. "
                    "Dhyan dein: Agar urine mein khoon aaye, thand lagkar tez bukhar ho, ya kamar ke nichle hisse mein tez dard ho, toh turant hospital doctor ko dikhayein."
                )
            else: # Hindi
                return (
                    "पेशाब में जलन और तकलीफ के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर मूत्र जांच करवाएं। "
                    "दिन भर में भरपूर साफ पानी (कम से कम 8 से 10 गिलास) पिएं, स्वच्छता का विशेष ध्यान रखें और पेशाब को ज्यादा देर न रोकें। "
                    "ढीले सूती कपड़े पहनें और तेज मिर्च-मसालेदार भोजन से बचें। "
                    "सावधानी: यदि पेशाब में खून दिखे, ठंड लगकर तेज बुखार आए या कमर के निचले हिस्से में असहनीय दर्द हो, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 10. SKIN RASH & ITCHING (DERMATOLOGICAL)
        # ─────────────────────────────────────────────────────────────
        if sym_names.intersection({"skin_rash", "itching", "arm_rash"}) or protocol_rule_id == "PHC-DERM-001":
            loc_label = f"on your {loc_str}" if loc_str else "on your skin"
            if lang == "en":
                return (
                    f"For your skin rash and itching {loc_label}, we recommend visiting your nearest Primary Health Centre (PHC) within 24 to 48 hours for a clinical assessment. "
                    "Gently cleanse the affected area with cool clean water, pat dry softly with a clean towel without rubbing, strictly avoid scratching to prevent skin breaks or secondary infection, and wear loose breathable cotton clothing. "
                    "Avoid applying harsh chemical soaps, unverified homemade pastes, or unprescribed creams. "
                    "Warning: If the rash spreads rapidly across your body, or is accompanied by swelling of your lips or face, breathing trouble, or high fever, seek emergency hospital care immediately."
                )
            elif lang == "hinglish":
                return (
                    "Skin par rash aur itching ke liye agle 24 se 48 ghante mein nearby Primary Health Centre (PHC) jakar doctor se skin check karwaein. "
                    "Skin ko saaf thande paani se dhoyein, ragadein nahi, khujlane se bachein taaki infection na faile, aur dheele sooti (cotton) kapde pehnein. "
                    "Bina doctor ki salah ke koi tezi se tel ya anjaan paste na lagayein. "
                    "Dhyan dein: Agar rash tezi se poore shareer par faile, chehre ya honthon par sujan aaye, ya saans lene mein takleef ho, toh turant emergency hospital jayein."
                )
            else: # Hindi
                return (
                    "त्वचा पर चकत्ते और खुजली के लिए अगले 24 से 48 घंटों में अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से त्वचा की जांच करवाएं। "
                    "प्रभावित त्वचा को साफ ठंडे पानी से धोएं, रगड़ें नहीं, खुजली करने से बचें ताकि संक्रमण न फैले और ढीले सूती कपड़े पहनें। "
                    "बिना डॉक्टरी सलाह के कोई भी तेज साबुन या घरेलू लेप न लगाएं। "
                    "सावधानी: यदि दाने तेजी से पूरे शरीर पर फैलें, चेहरे या होठों पर सूजन आए या सांस लेने में परेशानी हो, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 11. EAR PAIN / OTALGIA / ENT
        # ─────────────────────────────────────────────────────────────
        if "ear_pain" in sym_names or "ear_hurting" in sym_names or protocol_rule_id == "PHC-ENT-001":
            loc_label = loc_str if loc_str and "ear" in loc_str else "ear"
            if lang == "en":
                return (
                    f"For your {loc_label} pain, we advise visiting your nearest Primary Health Centre (PHC) within 24 to 48 hours for an otoscopic examination. "
                    "Keep your ear completely dry during bathing, strictly avoid inserting cotton buds, matchsticks, or safety pins into the ear canal, and never put unverified oils or home remedies into the ear. "
                    "Rest with the affected ear facing upward. "
                    "Warning: If you notice yellowish or bloody discharge, swelling or redness behind the ear, sudden hearing reduction, or high fever, seek hospital medical attention promptly."
                )
            elif lang == "hinglish":
                return (
                    "Kaan ke dard (ear pain) ke liye agle 24 se 48 ghante mein nearby Primary Health Centre (PHC) jakar doctor se kaan ki jaanch karwaein. "
                    "Nahate waqt kaan mein paani na jaane dein, kaan ke andar koi cotton bud ya teeli bilkul na daalein, aur bina doctor ki salah ke koi tel ya drop na daalein. "
                    "Dhyan dein: Agar kaan se peep ya khoon behne lage, kaan ke peeche sujan aaye ya tez bukhar ho, toh turant hospital doctor ko dikhayein."
                )
            else: # Hindi
                return (
                    "कान में दर्द की समस्या के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर कान की जांच करवाएं। "
                    "नहाते समय कान में पानी न जाने दें, कान में कोई सींक, बड या नुकीली चीज न डालें और कोई भी तेल या घरेलू नुस्खा कान में न डालें। "
                    "सावधानी: यदि कान से मवाद या खून आए, कान के पीछे सूजन हो या तेज बुखार हो, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 12. FEVER & CHILLS / SYSTEMIC
        # ─────────────────────────────────────────────────────────────
        if "fever" in sym_names or "chills" in sym_names:
            is_prolonged = (duration_val is not None and duration_val >= 5) or max_severity == "severe" or protocol_rule_id == "HOSP-FEV-001"
            
            if is_prolonged:
                if lang == "en":
                    return (
                        "High-Risk Fever Advisory: Your prolonged or severe fever requires a formal medical examination and blood investigations. "
                        "Please visit your nearest Community Health Centre (CHC) or District Hospital today. "
                        "Rest in a well-ventilated room, stay hydrated with plenty of clean water and warm fluids, and apply a damp lukewarm cloth on your forehead for comfort. "
                        "Warning: If you develop neck stiffness, severe shivering, confusion, continuous vomiting, or difficulty breathing, seek emergency care immediately."
                    )
                elif lang == "hinglish":
                    return (
                        "Lambe Samay ke Bukhar ki Salah: 5 ya usse zyada din se bukhar hone par hospital jakar blood test karwana zaroori hai. "
                        "Kripya aaj hi apne nearby Community Health Centre (CHC) ya District Hospital jayein. "
                        "Havadar kamre mein aaram karein, gunguna paani aur fluids khoob piyein, aur shareer tapne par mathe par taaje paani ki patti rakhein. "
                        "Dhyan dein: Agar gardan mein jakdan ho, tez kapkapi ho, behoshi lage ya saans phoolne lage, toh turant emergency care lein."
                    )
                else: # Hindi
                    return (
                        "दीर्घकालिक बुखार परामर्श: 5 या उससे अधिक दिनों का बुखार रक्त जांच और चिकित्सकीय परीक्षण की मांग करता है। "
                        "कृपया आज ही नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल जाकर डॉक्टर को दिखाएं। "
                        "हवादार कमरे में आराम करें, पर्याप्त पानी व तरल पदार्थ पिएं और तापमान अधिक लगने पर माथे पर ताजे पानी की पट्टी रखें। "
                        "सावधानी: यदि गर्दन में जकड़न, तेज कंपकंपी, सांस लेने में परेशानी या अत्यधिक सुस्ती हो, तो तुरंत अस्पताल जाएं।"
                    )

            elif triage_level >= 2 or (duration_val is not None and duration_val >= 2):
                if lang == "en":
                    return (
                        "For your fever and associated discomfort, we advise visiting your nearest Primary Health Centre (PHC) within 24 to 48 hours for clinical evaluation and vital checks. "
                        "Rest in an airy room, drink plenty of clean water and warm broths, wear lightweight breathable clothing, and apply a clean damp cloth on your forehead if temperature feels high. "
                        "Warning: If fever rises above 102 degrees, or is accompanied by severe shivering, neck stiffness, confusion, or difficulty breathing, go to a hospital immediately. "
                        "If fever persists beyond 48 hours, seek in-person medical evaluation."
                    )
                elif lang == "hinglish":
                    return (
                        "Bukhar aur badan dard ke liye agle 24 se 48 ghante mein nearby Primary Health Centre (PHC) jakar doctor se check-up karwaein. "
                        "Havadar kamre mein aaram karein, paani aur gunguna taral padarth khoob piyein, halki sooti dress pehnein aur mathe par gungune paani ki patti rakhein. "
                        "Dhyan dein: Agar tez kapkapi ke sath bukhar badhe, gardan mein jakdan ho, ya saans phoolne lage, toh turant hospital jayein."
                    )
                else: # Hindi
                    return (
                        "बुखार और शारीरिक तकलीफ के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से जांच करवाएं। "
                        "हवादार कमरे में भरपूर आराम करें, पर्याप्त पानी व गर्म तरल पदार्थ पिएं और तापमान अधिक लगने पर माथे पर ताजे पानी की पट्टी रखें। "
                        "सावधानी: यदि तेज कंपकंपी के साथ बुखार आए, गर्दन में जकड़न हो, या सांस लेने में परेशानी हो, तो तुरंत अस्पताल जाएं।"
                    )

            else: # Mild / Level 1 Home Care
                if lang == "en":
                    return (
                        "Your mild fever symptoms appear manageable with supportive home care at this stage. "
                        "Ensure complete physical rest in a well-ventilated room, drink plenty of warm water, and eat light nutritious food. "
                        "If the fever rises, persists beyond 48 hours, or is accompanied by severe weakness, visit your nearest Primary Health Centre (PHC) for a check-up."
                    )
                elif lang == "hinglish":
                    return (
                        "Aapke bukhar ke lakshan mild lag rahe hain jinka ghar par aaram se dhyaan rakha ja sakta hai. "
                        "Ghar par achhe se aaram karein, gunguna paani piyein aur halka poshtik khana khayein. "
                        "Agar bukhar 48 ghante se zyada chale ya badh jaye, toh nearby PHC jakar doctor ko dikhayein."
                    )
                else: # Hindi
                    return (
                        "आपके बुखार के लक्षण हल्के व शुरुआती हैं जिनका घर पर देखभाल संभव है। "
                        "भरपूर आराम करें, हल्का सुपाच्य भोजन लें और पर्याप्त मात्रा में गुनगुना पानी पिएं। "
                        "यदि 48 घंटों में बुखार ठीक न हो या बढ़े, तो प्राथमिक स्वास्थ्य केंद्र में डॉक्टर को दिखाएं।"
                    )

        # ─────────────────────────────────────────────────────────────
        # 13. COUGH & COLD / SORE THROAT (RESPIRATORY)
        # ─────────────────────────────────────────────────────────────
        if sym_names.intersection({"cold", "cough", "sore_throat"}):
            is_persistent = (duration_val is not None and duration_val >= 3) or max_severity in ["moderate", "severe"] or protocol_rule_id == "PHC-URI-001"
            
            if is_persistent or triage_level >= 2:
                if lang == "en":
                    return (
                        "For your persistent cough and throat irritation, we recommend visiting your nearest Primary Health Centre (PHC) within 24 to 48 hours for chest examination. "
                        "Drink warm water regularly throughout the day, practice steam inhalation once or twice daily, gargle with warm salt water for throat relief, and rest with your head slightly elevated. "
                        "Avoid cold beverages, exposure to dust, and smoke. "
                        "Warning: If you develop shortness of breath, chest tightness, continuous high fever, or cough up blood, visit a hospital emergency department immediately."
                    )
                elif lang == "hinglish":
                    return (
                        "Lagatar khansi aur gale ki takleef ke liye agle 24 se 48 ghante mein nearby Primary Health Centre (PHC) jakar doctor se chest check-up karwaein. "
                        "Regular gunguna paani piyein, din mein 1-2 baar bhaap (steam) lein, namak ke gungune paani se garare karein aur dhool-dhuein se bachein. "
                        "Dhyan dein: Agar seene mein dard ho, saans phoolne lage, ya khansi mein khoon aaye, toh turant hospital emergency jayein."
                    )
                else: # Hindi
                    return (
                        "लगातार खांसी और गले की तकलीफ के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर सीने की जांच करवाएं। "
                        "नियमित रूप से गुनगुना पानी पिएं, दिन में एक-दो बार भाप लें, नमक के गुनगुने पानी से गरारे करें और पर्याप्त आराम करें। "
                        "धूल और धुएं के संपर्क से बचें। "
                        "सावधानी: यदि सीने में दर्द हो, सांस फूलने लगे, या बलगम में खून दिखे, तो तुरंत अस्पताल जाएं।"
                    )
            else:
                if lang == "en":
                    return (
                        "For your mild cold and cough, supportive home care is recommended. "
                        "Drink plenty of warm fluids, inhale steam once or twice a day, gargle with warm salt water, and get sufficient rest. "
                        "If symptoms do not improve within 3 to 5 days, or if breathing becomes difficult, consult a doctor at your local Primary Health Centre (PHC)."
                    )
                elif lang == "hinglish":
                    return (
                        "Halke sardi-khansi ke liye gharelu supportive care ki salah hai. "
                        "Gunguna paani piyein, din mein 1-2 baar bhaap lein, gungune namak paani se garare karein aur pura rest lein. "
                        "Agar 3 se 5 din mein relief na mile ya saans lene mein takleef ho, toh nearby PHC doctor ko dikhayein."
                    )
                else: # Hindi
                    return (
                        "हल्की सर्दी-खांसी के लिए सामान्य घरेलू देखभाल की सलाह दी जाती है। "
                        "गुनगुना पानी पिएं, दिन में एक-दो बार भाप लें, नमक के गुनगुने पानी से गरारे करें और आराम करें। "
                        "यदि 3 से 5 दिनों में सुधार न हो या सांस में तकलीफ हो, तो प्राथमिक स्वास्थ्य केंद्र में डॉक्टर को दिखाएं।"
                    )

        # ─────────────────────────────────────────────────────────────
        # 14. MUSCULOSKELETAL / BACK / JOINT PAIN / SWELLING
        # ─────────────────────────────────────────────────────────────
        if sym_names.intersection({"joint_pain", "back_pain", "body_ache", "muscle_pain", "swelling"}):
            loc_label = f" ({loc_str})" if loc_str else ""
            if lang == "en":
                return (
                    f"For your muscle/body pain{loc_label}, we advise resting and visiting your nearest Primary Health Centre (PHC) within 24 to 48 hours for evaluation. "
                    "Rest the affected area, avoid lifting heavy objects or strenuous physical activity, apply a gentle warm or cool compress wrapped in a cloth for 15 minutes, and maintain proper posture. "
                    "Warning: If you cannot bear weight or walk, notice severe swelling with visible joint deformity, or experience numbness spreading down your legs, visit a hospital without delay."
                )
            elif lang == "hinglish":
                return (
                    f"Badan aur jodon ke dard{loc_label} ke liye agle 24 se 48 ghante mein nearby Primary Health Centre (PHC) jakar doctor se check-up karwaein. "
                    "Affected hisse ko aaram dein, bhari wazan na uthayein, kapde mein lapet kar halki gunguni sikai karein aur proper posture banaye rakhein. "
                    "Dhyan dein: Agar pair par wazan daal kar chalna namumkin ho jaye, tez sujan ya sunnpan mehsoos ho, toh turant hospital doctor ko dikhayein."
                )
            else: # Hindi
                return (
                    f"बदन व जोड़ों के दर्द{loc_label} के लिए अगले 24 से 48 घंटों में नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर जांच करवाएं। "
                    "प्रभावित हिस्से को आराम दें, भारी वजन न उठाएं, कपड़े में लपेटकर हल्की गर्म सिकाई करें और सही मुद्रा में बैठें। "
                    "सावधानी: यदि पैर पर वजन देना या चलना असंभव हो, अत्यधिक सूजन या सुन्नपन आए, तो तुरंत अस्पताल जाएं।"
                )

        # ─────────────────────────────────────────────────────────────
        # 15. GENERAL / FALLBACK STRUCTURED GUIDANCE
        # ─────────────────────────────────────────────────────────────
        symptom_phrase = patient_facing_summary or "your reported health concerns"
        
        if lang == "en":
            if triage_level >= 3:
                return (
                    f"Based on your symptoms ({symptom_phrase}), a formal hospital evaluation is recommended today. "
                    "Please visit your nearest Community Health Centre (CHC) or District Hospital for clinical assessment. "
                    "Rest comfortably, avoid physical exertion, stay hydrated, and seek emergency care immediately if your symptoms worsen rapidly."
                )
            elif triage_level == 2:
                return (
                    f"For your health concern regarding {symptom_phrase}, we advise visiting your nearest Primary Health Centre (PHC) within the next 24 to 48 hours for clinical review. "
                    "Ensure adequate rest, stay hydrated with clean water, eat light nutritious food, and avoid unverified remedies. "
                    "Warning: If you develop severe pain, breathing difficulty, or high fever, seek emergency medical care promptly."
                )
            else:
                return (
                    f"Your symptoms of {symptom_phrase} appear mild and manageable with supportive home care. "
                    "Ensure adequate hydration, nutritious light food, and sufficient rest. "
                    "If your condition does not improve within 24 to 48 hours or worsens, please consult a physician at your local PHC."
                )

        elif lang == "hinglish":
            if triage_level >= 3:
                return (
                    f"Aapke symptoms ({symptom_phrase}) ko dekhte hue hospital mein doctor se check-up zaroori hai. "
                    "Kripya bina delay kiye apne nearby Community Health Centre (CHC) ya District Hospital jayein. "
                    "Aaram karein, paani piyein aur agar takleef badhe toh turant emergency care lein."
                )
            elif triage_level == 2:
                return (
                    f"Aapke symptoms ({symptom_phrase}) ke liye hamari advice hai ki agle 24 se 48 ghante ke andar apne nearby Primary Health Centre (PHC) jaakar doctor se check-up karwaein. "
                    "Pani khoob piyein, aaram karein, halka khana khayein aur bina doctor ki salah ke koi anjaan dawa na lein. "
                    "Agar tez dard ya bukhar badhe toh turant hospital jayein."
                )
            else:
                return (
                    f"Aapke symptoms ({symptom_phrase}) mild lag rahe hain. "
                    "Proper rest karein, halka khana khayein aur plenty of clean water piyein. "
                    "Agar 24 se 48 hours mein relief na mile ya takleef badhe, toh nearby PHC doctor se check karwayein."
                )

        else: # Pure Hindi
            if triage_level >= 3:
                return (
                    f"आपके बताए गए लक्षणों ({symptom_phrase}) को देखते हुए अस्पताल में जांच की आवश्यकता है। "
                    "कृपया बिना देर किए नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल जाकर डॉक्टर से परामर्श लें। "
                    "आराम करें और तकलीफ बढ़ने पर तुरंत आपातकालीन सहायता लें।"
                )
            elif triage_level == 2:
                return (
                    f"आपके लक्षणों ({symptom_phrase}) के आधार पर सलाह है कि आप अगले 24 से 48 घंटों में अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से जांच करवाएं। "
                    "पर्याप्त पानी पिएं, आराम करें, हल्का भोजन लें और बिना डॉक्टरी सलाह के कोई दवा न लें। "
                    "यदि तेज दर्द या सांस लेने में तकलीफ हो, तो तुरंत अस्पताल जाएं।"
                )
            else:
                return (
                    f"आपके लक्षण ({symptom_phrase}) सामान्य व हल्के प्रतीत होते हैं। "
                    "भरपूर आराम करें, हल्का भोजन लें और पर्याप्त पानी या तरल पदार्थ पिएं। "
                    "यदि 24 से 48 घंटे में सुधार न दिखे या तकलीफ बढ़े, तो नजदीकी प्राथमिक स्वास्थ्य केंद्र में डॉक्टर को दिखाएं।"
                )

    def append_asha_confirmation(self, guidance_text: str, language: str = "hinglish") -> str:
        """
        Appends localized confirmation sentence only when an ASHA worker alert was successfully dispatched.
        """
        lang = language.lower()
        if "en" in lang:
            asha_note = " Your local ASHA community health worker has been notified to assist with follow-up."
        elif "hinglish" in lang:
            asha_note = " Humne aapke area ki ASHA didi ko bhi inform kar diya hai taaki wo follow-up mein help kar sakein."
        else: # Hindi
            asha_note = " आपकी स्थानीय आशा कार्यकर्ता को भी फॉलो-अप सहायता के लिए सूचित कर दिया गया है।"
        
        # Avoid duplicate appending
        if "ASHA" in guidance_text or "आशा" in guidance_text:
            return guidance_text
        return guidance_text.rstrip() + asha_note
