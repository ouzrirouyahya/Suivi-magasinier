# HydroMines — Industrial Terminology & Corporate UX Normalization (v13.1)

This document establishes the official design standards, semantic requirements, and security governance policies applied during Phase v13.1 of the HydroMines storekeeper and mining logistics platform. 

The goal of this restructuring is to transition HydroMines from a scientific/forensic lab feeling with excessive "AI" and cryptographic buzzwords into a sober, realistic, executive-grade corporate mining workspace.

---

## 🏛️ System & Sidebar Nomenclature Realignment

The primary modules of the platform have been renamed to reflect professional logistics roles and mining operational realities rather than futuristic AI algorithms.

| Old Scientific / Futuristic Label | New Sober Corporate Label | Page Reference |
| :--- | :--- | :--- |
| **🤖 MAGASINIER IA HYDRO** | `Assistant Opérationnel Magasin` | `/src/components/MagasinierIAHydro` |
| **🧠 AUDIT & INTELLIGENCE'** | `Audit & Analyse Opérationnelle` | `/src/components/AuditIntelligenceMagasin` |
| **⚙️ ORCHESTRATION & COMPLIANCE IA** | `Centre de Coordination` | `/src/components/AutomationOrchestrator` |
| **📋 CHECK-LIST PROD/EPI** | `Contrôles & Vérifications Terrain` | `/src/components/ProductionChecklist` |
| **📈 FINANCE & FLUX** | `Flux & Valorisation Stock` | `/src/components/FinancialDashboard` |

---

## 🔬 Terminology Governance: From "Sci-Fi Lab" to "Industrial Site"

To ensure warehouse operators never experience "split-brain" wording, academic distress, or cryptographic clutter, the following dictionary migrations have been implemented across high-visibility panels, notifications, toasts, and charts:

*   ❌ **Intelligence IA / Moteur Prédictif** $\rightarrow$ ✅ **Analyse Opérationnelle / Analyse Préventive**
*   ❌ **Supervision & Anomalies Prédictives** $\rightarrow$ ✅ **Surveillance des Flux & Cohérence des Stocks**
*   ❌ **IA embarquée / Assistant Expert IA** $\rightarrow$ ✅ **Contrôle Automatique / Assistant Technique**
*   ❌ **Reconstitution neuronale des stocks** $\rightarrow$ ✅ **Rapprochement automatique des stocks**
*   ❌ **Forensic / Médico-légal** $\rightarrow$ ✅ **Contrôle de Cohérence / Audit d'Écarts**
*   ❌ **SRE Certified / Crypto-Invariants** $\rightarrow$ ✅ **Standard d'Audit Opérationnel / Validation de Saisie**

---

## 🎨 Visual Normalization & Corporate Aesthetics

1.  **Chroma and Neon Reduction**:
    *   Subdued general bright neon colors down to standard slate colors.
    *   Disabled continuous pulse and scan animations on standard logos/headers to avoid distracting busy warehouse supervisors.
2.  **Typography**:
    *   Paired **Space Grotesk** and **Inter** for standard clean sans-serif corporate UI layout.
    *   Preserved **JetBrains Mono** only for strict numbers (such as SKU quantities, float valuations, transactional ledger hashes).
3.  **Contrast & Accessibility**:
    *   Sober off-white light panels and highly legibile dark charcoal margins with generous negative spacing.

This normalization guidelines must be persisted in all future feature revisions of HydroMines.
