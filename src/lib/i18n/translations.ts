/**
 * Translation dictionaries for the cannabis care EMR.
 *
 * V1 ships with English (en) and Spanish (es).
 * Keys are dot-namespaced for clarity but stored flat for fast lookup.
 * Progressive adoption: components opt in by calling `t(key, locale)`.
 */

export const translations: Record<string, Record<string, string>> = {
  // -----------------------------------------------------------------------
  // English
  // -----------------------------------------------------------------------
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.profile": "Profile",
    "nav.intake": "Intake",
    "nav.records": "Records",
    "nav.assessments": "Assessments",
    "nav.outcomes": "Outcomes",
    "nav.lifestyle": "Lifestyle",
    "nav.carePlan": "Care plan",
    "nav.medications": "Medications",
    "nav.garden": "My Garden",
    "nav.achievements": "Achievements",
    "nav.roadmap": "My Roadmap",
    "nav.myStory": "My Story",
    "nav.messages": "Messages",
    "nav.learn": "Learn",

    // Common actions
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.submit": "Submit",
    "action.signIn": "Sign in",
    "action.signOut": "Sign out",
    "action.back": "Back",
    "action.next": "Next",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.confirm": "Confirm",
    "action.close": "Close",
    "action.search": "Search",
    "action.filter": "Filter",

    // Patient portal headers
    "portal.greeting": "How are you feeling today?",
    "portal.carePlan": "Your care plan",
    "portal.outcomes": "How you've been feeling",
    "portal.trackProgress": "Track your progress",
    "portal.roadmap.title": "Your health trajectory",
    "portal.roadmap.past": "Where you've been",
    "portal.roadmap.present": "Where you are now",
    "portal.roadmap.future": "Where you could go",
    "portal.achievements.title": "Your health rings",
    "portal.myStory.title": "A care story",

    // Medical terms
    "metric.pain": "Pain",
    "metric.sleep": "Sleep",
    "metric.anxiety": "Anxiety",
    "metric.mood": "Mood",
    "metric.nausea": "Nausea",
    "metric.appetite": "Appetite",
    "metric.energy": "Energy",
    "metric.adherence": "Adherence",
    "metric.sideEffects": "Side effects",

    // Labels
    "label.date": "Date",
    "label.value": "Value",
    "label.note": "Note",
    "label.status": "Status",
    "label.active": "Active",
    "label.inactive": "Inactive",

    // Disclaimer
    "disclaimer.general":
      "This document is a personal summary and is not a substitute for professional medical advice. Always consult your care team for clinical decisions.",
    "disclaimer.roadmap":
      "This roadmap is a conceptual illustration to help you visualize your health journey. It does not constitute a medical prediction or guarantee of outcomes.",

    // Empty states
    "empty.noData": "No data yet",
    "empty.noVisits": "No visits recorded yet.",
    "empty.noOutcomes": "No outcome data logged yet.",
  },

  // -----------------------------------------------------------------------
  // Spanish
  // -----------------------------------------------------------------------
  es: {
    // Navigation
    "nav.home": "Inicio",
    "nav.profile": "Perfil",
    "nav.intake": "Admision",
    "nav.records": "Registros",
    "nav.assessments": "Evaluaciones",
    "nav.outcomes": "Resultados",
    "nav.lifestyle": "Estilo de vida",
    "nav.carePlan": "Plan de cuidado",
    "nav.medications": "Medicamentos",
    "nav.garden": "Mi Jardin",
    "nav.achievements": "Logros",
    "nav.roadmap": "Mi Hoja de ruta",
    "nav.myStory": "Mi Historia",
    "nav.messages": "Mensajes",
    "nav.learn": "Aprender",

    // Common actions
    "action.save": "Guardar",
    "action.cancel": "Cancelar",
    "action.submit": "Enviar",
    "action.signIn": "Iniciar sesion",
    "action.signOut": "Cerrar sesion",
    "action.back": "Atras",
    "action.next": "Siguiente",
    "action.edit": "Editar",
    "action.delete": "Eliminar",
    "action.confirm": "Confirmar",
    "action.close": "Cerrar",
    "action.search": "Buscar",
    "action.filter": "Filtrar",

    // Patient portal headers
    "portal.greeting": "Como se siente hoy?",
    "portal.carePlan": "Su plan de cuidado",
    "portal.outcomes": "Como se ha sentido",
    "portal.trackProgress": "Siga su progreso",
    "portal.roadmap.title": "Su trayectoria de salud",
    "portal.roadmap.past": "De donde viene",
    "portal.roadmap.present": "Donde esta ahora",
    "portal.roadmap.future": "A donde podria ir",
    "portal.achievements.title": "Sus anillos de salud",
    "portal.myStory.title": "Una historia de cuidado",

    // Medical terms
    "metric.pain": "Dolor",
    "metric.sleep": "Sueno",
    "metric.anxiety": "Ansiedad",
    "metric.mood": "Estado de animo",
    "metric.nausea": "Nausea",
    "metric.appetite": "Apetito",
    "metric.energy": "Energia",
    "metric.adherence": "Adherencia",
    "metric.sideEffects": "Efectos secundarios",

    // Labels
    "label.date": "Fecha",
    "label.value": "Valor",
    "label.note": "Nota",
    "label.status": "Estado",
    "label.active": "Activo",
    "label.inactive": "Inactivo",

    // Disclaimer
    "disclaimer.general":
      "Este documento es un resumen personal y no sustituye el consejo medico profesional. Siempre consulte a su equipo de atencion para decisiones clinicas.",
    "disclaimer.roadmap":
      "Esta hoja de ruta es una ilustracion conceptual para ayudarle a visualizar su recorrido de salud. No constituye una prediccion medica ni una garantia de resultados.",

    // Empty states
    "empty.noData": "Sin datos aun",
    "empty.noVisits": "No hay visitas registradas aun.",
    "empty.noOutcomes": "No hay datos de resultados registrados aun.",
  },
};
