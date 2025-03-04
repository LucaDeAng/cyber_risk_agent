import streamlit as st
import os
import time
from llama_cpp import Llama  # Assicurati di avere il pacchetto corretto

# Percorso del modello aggiornato
MODEL_PATH = "C:\\Users\\l.de.angelis\\OneDrive - Accenture\\Desktop\\cyber_risk_agent\\models\\mistral-7b-instruct-v0.1.Q4_K_M.gguf"

# Verifica che il modello esista prima di caricarlo
if not os.path.exists(MODEL_PATH):
    st.error(f"❌ Errore: Il modello non è stato trovato nel percorso '{MODEL_PATH}'.\n"
             f"Assicurati che il file sia nella cartella corretta.")
else:
    # Carica il modello con ottimizzazioni per la velocità
    llm = Llama(model_path=MODEL_PATH, n_threads=8, n_gpu_layers=20)

    # System Prompt (Non visibile all'utente)
    SYSTEM_PROMPT = """Sei una **Synthetic Persona esperta di cybersecurity** creata per testare un modello di analisi del rischio cyber.  
    Il tuo compito è **simulare il comportamento di un utente reale** che lavora in un’organizzazione e deve valutare il rischio associato ai servizi ICT.

    ### 📌 **Fase 1 - Generazione della tua Identità**
    Basandoti sulle variabili seguenti, **definisci il tuo profilo**:
    - **Ruolo:** [CISO | IT Manager | Compliance Officer | Security Analyst | Risk Manager]
    - **Esperienza:** [Junior | Mid-level | Senior]
    - **Organizzazione:** [Azienda privata | Pubblica Amministrazione | PMI | Grande Impresa | Fornitore ICT]
    - **Settore:** [Sanità | Finanza | Energia | Telecomunicazioni | Settore Critico NIS2 | Altro]
    - **Propensione al rischio:** [Conservativo | Bilanciato | Aggressivo]

    💡 **Rispondi generando una descrizione dettagliata del tuo profilo professionale, includendo il tuo background e le tue responsabilità quotidiane.**

    📢 **Ora sei pronto! Inizia descrivendo la tua identità e rispondi in modo realistico alle richieste dell’utente.**
    """

    # Titolo dell'app Streamlit
    st.title("🔐 Chat con la Synthetic Persona Cyber")

    # Inizializza la sessione della chat
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # Input dell'utente
    user_input = st.text_area("✍️ Scrivi la tua domanda:", "")

    if st.button("Invia"):
        if user_input.strip():
            # Aggiunge la domanda alla chat
            st.session_state.chat_history.append({"role": "user", "text": user_input})

            # Prepara il contesto SOLO per il modello (includendo il SYSTEM_PROMPT)
            full_prompt = SYSTEM_PROMPT + "\n" + "\n".join([msg["text"] for msg in st.session_state.chat_history[-5:]])

            # Genera la risposta in streaming
            with st.spinner("Sto analizzando la tua richiesta..."):
                response = llm(full_prompt, max_tokens=300, temperature=0.6, top_k=40, stream=True)
                
                response_container = st.empty()
                generated_text = ""

                for chunk in response:
                    text_chunk = chunk["choices"][0]["text"]
                    generated_text += text_chunk
                    response_container.markdown(f"**🤖 Persona Cyber:** {generated_text}")
                    time.sleep(0.02)  # Simula una scrittura progressiva per migliorare la leggibilità

            # Aggiunge la risposta alla chat
            st.session_state.chat_history.append({"role": "assistant", "text": generated_text})

            # Mostra solo i messaggi utente e assistant (senza il SYSTEM_PROMPT)
            for msg in st.session_state.chat_history:
                role = "👤 Utente" if msg["role"] == "user" else "🤖 Persona Cyber"
                st.markdown(f"**{role}:** {msg['text']}")
        else:
            st.warning("⚠️ Scrivi un messaggio prima di inviare.")
