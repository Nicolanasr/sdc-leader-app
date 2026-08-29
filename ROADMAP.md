# 🗺️ Scout des Cèdres Leader App — Product Roadmap & Feature Specifications

This document outlines the prioritised development roadmap and technical design specifications for upcoming milestones.

---

## 📌 Development Sequence

```
1. Phase 1: 🎖️ Official Scout Progression & Badge Passport (Passeport de Progression & Badges)
2. Phase 2: 📋 Weekly Meeting Session Planner (Canevas & Fiche de Réunion)
3. Phase 3: ⛺ Interactive Summer & Weekend Camp Planner (Planificateur de Camp)
```

---

## 🎖️ Phase 1: The Official Scout Progression & Badge Passport (*Passeport de Progression & Badges*)

### 1. Overview & Objectives
Transform the app from an administrative tool into the educational core of the scout group. Allow leaders to track and validate every youth’s scout ranks, milestones, and specialty badges in real-time during meetings and camps with a single tap on mobile.

### 2. Pedagogy & Rank Hierarchy by Branch

#### 🐺 Meute / Pack (Louveteaux & Jeannettes — 7 to 11 years)
* **Intégration & Patte-Tendre** (Onboarding & Scout Law discovery)
* **1ère Étoile** (First Star — basic camp craft, hygiene, scout promise)
* **2ème Étoile** (Second Star — autonomy, nature, pack games leadership)
* **Loup Agile / Gibier de Choix** (Highest pack rank before transition)
* **Badges Meute**: *Ami des Animaux, Artiste, Messager, Secouriste Junior, etc.*

#### ⚜️ Troupe / Troop (Éclaireurs & Guides — 12 to 16 years)
* **Aspirant / Novice** (Learning the Patrol System & Scout traditions)
* **La Promesse Scoute** (The solemn scout investiture & cross/fleur-de-lis)
* **Seconde Classe** (Second Class — Firecraft, knotting, pioneering, camp cooking, compass)
* **Première Classe** (First Class — 24h hike, advanced topography, signaling, leadership)
* **Éclaireur de Pointe / Majeur** (Top rank & Patrol Leader master)
* **Badges de Spécialité (Brevet d'Action)**:
  * *Technique*: Pionnier, Topographe, Transmissions, Bosco/Nœuds, Campeur.
  * *Secourisme & Nature*: Secouriste, Sauveteur, Naturaliste, Forestier.
  * *Animation*: Boute-en-train, Maître de Cérémonie, Cuisinier de Camp, Reporter.

#### 🧗 Poste / Clan (Routiers & Caravelles — 17+ years)
* **Compagnon / Départ Routier / Service** (Leadership, community service, spiritual engagement)

---

### 3. Database Architecture (Proposed Schema)

```sql
-- Table: badge_definitions (Standardized Curriculum Requirements)
CREATE TABLE public.badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_scope TEXT NOT NULL, -- 'meute', 'troupe', 'poste'
    category TEXT NOT NULL,     -- 'rank', 'specialty'
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of requirement objects { id, label, description }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: member_badge_progress (Individual Youth Progress)
CREATE TABLE public.member_badge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
    completed_requirements TEXT[] NOT NULL DEFAULT '{}', -- Array of completed requirement IDs
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'ready_for_ceremony', 'awarded'
    awarded_date TIMESTAMPTZ,
    validated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_member_badge UNIQUE (member_id, badge_id)
);
```

### 4. Key UI & Functional Requirements
* **Mobile 1-Tap Sign-Off**: Leaders tap `[✓]` next to a requirement (e.g. *Tied a square lashing*, *Navigated with compass*) during a hike or meeting.
* **Progress Ring & Badges Showcase**: Each scout’s profile displays an interactive visual ring and unlocked badge badges.
* **"Ceremony Ready" (Prêt pour la Promesse)**: 1-click filter before ceremonial courts to instantly see who qualifies for rank badges and promises.
* **PDF Printable Certificate & Passport**: Generates an exportable PDF Progression Card for physical scout booklets.

---

## 📋 Phase 2: Weekly Meeting Session Planner (*Canevas & Fiche de Réunion*)

### 1. Overview & Objectives
Streamline the 2-to-3 hour weekly Saturday/Sunday gatherings. Allow the staff team (*Maîtrise*) to collaborate on the meeting schedule, assign activity leads, prepare materials, and align everyone before arrival.

### 2. Standard Meeting Canvas Structure
* **14:00 – 14:15**: *Rassemblement & Inspection* (Uniform check, opening prayer, flag ceremony).
* **14:15 – 15:00**: *Grand Jeu de Plein Air* (Outdoor wide game / obstacle course).
* **15:00 – 15:30**: *Atelier Technique & Épreuves* (Knots, first aid, song rehearsals).
* **15:30 – 15:45**: *Goûter & Temps de Patrouille* (Snack & Patrol council).
* **15:45 – 16:15**: *Rassemblement Final & Clôture* (Announcements, awards, Scout prayer).

### 3. Database Architecture (Proposed Schema)

```sql
-- Table: meeting_plans
CREATE TABLE public.meeting_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    theme TEXT,
    objectives TEXT,
    schedule_blocks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, time, duration_min, title, description, lead_leader_id, materials_needed }
    materials_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Key UI & Functional Requirements
* **Drag-and-Drop / Interactive Time Blocks**: Easily adjust block durations, swap games, and assign assistant leaders.
* **Live "On-Duty" Mobile View**: Real-time ticker showing *"What's happening right now"* and *"Who is leading"*.
* **WhatsApp 1-Click Meeting Briefing**: Sends the final schedule directly to the leadership WhatsApp group with one tap.

---

## ⛺ Phase 3: Comprehensive Camp Planner (*Planificateur de Camp & Emploi du Temps*)

### 1. Overview & Objectives
An all-in-one mission control center for summer camps (3 to 10 days) and weekend overnights.

### 2. Core Modules
1. **7-Day Master Schedule Grid (Grille Horaire)**:
   - Full daily timetable from *Réveil* (07:00) to *Extinction des feux* (22:30).
   - Rotating duties matrix: Patrol on kitchen duty (*Service de cuisine*), Patrol on water/wood (*Bois & Eau*), Patrol on flag/inspection (*Service de garde*).
2. **Camp Duty Roster & Staff Assignments**:
   - Master chart showing every leader’s roles (Camp Chief, Medic/Infirmier, Quartermaster, Kitchen Supervisor, Grand Game Master).
3. **Emergency Evacuation & Nearest Hospital Dossier**:
   - GPS coordinates, fastest road route, emergency numbers, and civil defense contacts.
4. **Exportable Camp Staff Booklet (Livret du Staff)**:
   - 1-click generation of a pocket-sized PDF containing the complete schedule, emergency contacts, medical alerts, and game blueprints.

---

## 📌 Document Version
* **Document Created**: August 30, 2026
* **Status**: Ready for execution when prioritized by the team.
