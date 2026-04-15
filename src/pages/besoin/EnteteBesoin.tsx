// ============================================================
// components/EnteteBesoin/EnteteBesoin.tsx
// Remplace : EnteteBesoin.cshtml (partial read-only)
// Emplacement : src/components/besoin/EnteteBesoin.tsx
// ============================================================

import React from "react";
import { Link } from "react-router";
import type { DA_BESOIN_AACHETERDto } from "../../types/besoin.types";
import { formatDate, formatDateTime } from "../../utils/besoin.utils";
import { usePermissions } from "../../hooks/usePermissions";

// ── Slider d'importance (remplace <input type=range disabled>) ─

const IMPORTANCE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Très faible", color: "text-green-600" },
  2: { label: "Faible",      color: "text-lime-600" },
  3: { label: "Moyen",       color: "text-yellow-600" },
  4: { label: "Important",   color: "text-orange-600" },
  5: { label: "Critique",    color: "text-red-600" },
};

const ImportanceSlider: React.FC<{ value: number }> = ({ value }) => {
  const info = IMPORTANCE_LABELS[value] ?? { label: String(value), color: "text-gray-600" };
  const percent = ((value - 1) / 4) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-2 rounded-full bg-blue-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-sm font-bold min-w-[90px] ${info.color}`}>
        {info.label}
      </span>
    </div>
  );
};

// ── Champ de lecture seule ────────────────────────────────────

const ReadField: React.FC<{
  label: string;
  value?: string | null;
  linkTo?: string;
}> = ({ label, value, linkTo }) => (
  <div className="form-group">
    {linkTo ? (
      <label
        className="col-form-label"
        style={{ color: "#03a9f3", cursor: "pointer" }}
      >
        {/* Remplace : $(#lbDemandeBesoin).click → window.open */}
        <Link to={linkTo} target="_blank" rel="noreferrer">{label}</Link>
      </label>
    ) : (
      <label className="col-form-label">{label}</label>
    )}
    <input
      className="form-control"
      type="text"
      value={value ?? ""}
      readOnly
    />
  </div>
);

// ── Composant principal ──────────────────────────────────────

interface Props {
  besoin: DA_BESOIN_AACHETERDto;
}

const EnteteBesoin: React.FC<Props> = ({ besoin }) => {
  const { can } = usePermissions();
  // Remplace : @if (consulte) { <label style="color: #03a9f3..."> }
  const canConsulte = can("Gestion_Demandes", "Consulter");

  return (
    <div className="card-body pt-0">
      <div className="row">
        {/* N° Demande — lien conditionnel si permission Consulter */}
        <div className="col-md-4">
          <ReadField
            label="N° demande"
            value={besoin.B_Numero}
            linkTo={canConsulte ? `/besoin/details/${besoin.B_No}` : undefined}
          />
        </div>

        <div className="col-md-4">
          <ReadField label="Titre" value={besoin.B_Titre} />
        </div>

        <div className="col-md-4">
          {/* Remplace : EtatAffichageDateTime('#B_DateCreation', false) */}
          <ReadField label="Date" value={formatDateTime(besoin.B_DateCreation)} />
        </div>

        <div className="col-md-4">
          <ReadField label="Affaire" value={besoin.CA_Intitule} />
        </div>

        <div className="col-md-4">
          <ReadField label="Dépôt" value={besoin.DE_Intitule} />
        </div>

        <div className="col-md-4">
          {/* Remplace : EtatAffichageDate('#B_DateLivraison', false) */}
          <ReadField label="Date de livraison" value={formatDate(besoin.B_DateLivraison)} />
        </div>

        <div className="col-md-4">
          <ReadField label="Demandeur" value={besoin.B_Demandeur} />
        </div>

        <div className="col-md-4 pt-2">
          <div className="form-group">
            <label className="control-label">Degré d'importance</label>
            {/* Remplace : <input type=range disabled /> + <span>@GetEnumDescription()</span> */}
            <ImportanceSlider value={besoin.B_DegreImportance as unknown as number ?? 1} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnteteBesoin;