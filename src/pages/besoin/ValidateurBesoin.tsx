// ============================================================
// components/ValidateurBesoin/ValidateurBesoin.tsx
// Remplace : ValidateurBesoin.cshtml (partial jsGrid)
// Emplacement : src/components/besoin/ValidateurBesoin.tsx
// ============================================================

import React from "react";
import { Table, Select, Tag, Tooltip, Avatar, Skeleton } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useCircuitValidation } from "../../hooks/useBesoin";
import {
  STATUT_LABELS,
  ROLE_VALIDATEUR_LABELS,
  getStatutBadge,
  getRoleBadge,
  getInitials,
  getColorFromName,
  formatDateTime,
} from "../../utils/besoin.utils";
import type { Validateur_BesoinVM } from "../../types/besoin.types";
import { Statut, Role_Validateur, Type_Validation } from "../../types/besoin.types";

// ────────────────────────────────────────────────────────────

interface Props {
  bT_Id: number;
  idBesoin: number;
  idDemandeur: string;
  v_Type: Type_Validation;
}

const ValidateurBesoin: React.FC<Props> = ({
  bT_Id,
  idBesoin,
  idDemandeur,
  v_Type,
}) => {
  const { validateurs, loading } = useCircuitValidation(
    bT_Id,
    idBesoin,
    idDemandeur,
    v_Type
  );

  // ── Colonnes (miroir exact du jsGrid ValidateurBesoin) ───────
  const columns: ColumnsType<Validateur_BesoinVM> = [
    {
      title: "Intitulé",
      dataIndex: "US_UserIntitule",
      width: 180,
      // Remplace : filterTemplate text + itemTemplate avatar
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <Avatar
            size={32}
            style={{ backgroundColor: getColorFromName(name ?? ""), fontSize: 13 }}
          >
            {getInitials(name ?? "")}
          </Avatar>
          <span className="text-sm font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: "Rôle",
      dataIndex: "V_Role_Validateur",
      width: 180,
      // Remplace : Role_ValidateurField filterTemplate + switch/createBadge
      filterDropdown: () => (
        <Select style={{ width: 200 }} defaultValue={-1}>
          {Object.entries(ROLE_VALIDATEUR_LABELS).map(([k, v]) => (
            <Select.Option key={k} value={Number(k)}>{v}</Select.Option>
          ))}
        </Select>
      ),
      render: (role: Role_Validateur) => {
        const badge = getRoleBadge(role);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}
          >
            <i className={`fas ${badge.icon}`} />
            {ROLE_VALIDATEUR_LABELS[role] ?? role}
          </span>
        );
      },
    },
    {
      title: "Date notification",
      dataIndex: "NU_DateTime",
      width: 150,
      render: (v) => formatDateTime(v),
    },
    {
      title: "Date validation",
      dataIndex: "V_ValidationDate",
      width: 150,
      render: (v) => formatDateTime(v),
    },
    {
      title: "Statut",
      dataIndex: "V_Status",
      width: 180,
      // Remplace : StatusValidationField filterTemplate + itemTemplate
      render: (statut: Statut) => {
        const badge = getStatutBadge(statut);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}
          >
            <i className={`fas ${badge.icon}`} />
            {STATUT_LABELS[statut] ?? statut}
          </span>
        );
      },
    },
  ];

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;

  return (
    <Table<Validateur_BesoinVM>
      rowKey="V_Id"
      dataSource={validateurs}
      columns={columns}
      pagination={false}
      size="small"
      scroll={{ x: 750 }}
      // Acheteur en bas (miroir de listAcheteurs = listValidateurs.Where(!x.BA_Acheteur) + AddRange)
      // Note: l'API renvoie déjà la liste triée correctement
    />
  );
};

export default ValidateurBesoin;