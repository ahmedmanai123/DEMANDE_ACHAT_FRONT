// ============================================================
// components/ValidationAction/ValidationAction.tsx
// Remplace : logique modale valider/rejeter/rectifier dans
//            DetailsBesoin.cshtml et Validation_Demande.cshtml
// Emplacement : src/components/besoin/ValidationAction.tsx
// ============================================================

import React, { useState } from "react";
import { Modal, Button, Select, Input, Alert, Space, Popconfirm } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
} from "@ant-design/icons";

import { useValidationAction } from "../../hooks/useBesoin";
import { Statut, Role_Validateur } from "../../types/besoin.types";
import type { DA_VALIDATION } from "../../types/besoin.types";

const { TextArea } = Input;

// ── Motifs de refus/rectification (à charger depuis l'API) ──

interface MotifRefus {
  MR_No: number;
  MR_Intitule: string;
  MR_TypeMotif: number; // 0=Rejete, 1=Reprendre_Circuit
}

interface Props {
  validation: DA_VALIDATION;
  isAcheteur?: boolean;
  isAdmin?: boolean;
  motifsRefus?: MotifRefus[];
  onSuccess?: () => void;
}

// ─────────────────────────────────────────────────────────────

const ValidationAction: React.FC<Props> = ({
  validation,
  isAcheteur = false,
  isAdmin = false,
  motifsRefus = [],
  onSuccess,
}) => {
  const [motif, setMotif] = useState("");
  const [mR_No, setMR_No] = useState<number>(0);
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [showRectifModal, setShowRectifModal] = useState(false);

  const { submit, loading, error } = useValidationAction(onSuccess);

  // ── Valider ──────────────────────────────────────────────────
  // Remplace : onclick Valider → POST valider-etape avec Statut.Valide
  const handleValider = () => {
    submit({ ...validation, V_Status: Statut.Valide });
  };

  // ── Rejeter ──────────────────────────────────────────────────
  // Remplace : onClick Rejeter → modal motif → POST Statut.Rejete
  const handleRefus = () => {
    if (!motif.trim()) return;
    submit({
      ...validation,
      V_Status: Statut.Rejete,
      V_Motif: motif,
      MR_No: mR_No,
    });
    setShowRefusModal(false);
  };

  // ── Rectifier ────────────────────────────────────────────────
  // Remplace : onClick Rectifier → modal motif → POST Statut.Rectifier_Demande
  const handleRectifier = () => {
    if (!motif.trim() || !mR_No) return;
    submit({
      ...validation,
      V_Status: Statut.Rectifier_Demande,
      V_Motif: motif,
      MR_No: mR_No,
    });
    setShowRectifModal(false);
  };

  // ── Conditions d'affichage (miroir exact des conditions Razor) ─
  // Remplace : @if (V_Status == EnAttente && V_Role != Demandeur) etc.
  const isEnAttente = validation.V_Status === Statut.EnAttente
    || validation.V_Status === Statut.Attente_Acheter;

  const isDemandeur =
    validation.V_Role_Validateur === Role_Validateur.Demandeur;

  const canValider = isEnAttente; // Tous les rôles en attente peuvent valider
  const canRejeter = isEnAttente && !isDemandeur;
  const canRectifier = isEnAttente && !isDemandeur && !isAcheteur;

  return (
    <div className="flex flex-wrap gap-2">
      {/* ── Bouton Valider ── */}
      {canValider && (
        <Popconfirm
          title="Confirmer la validation ?"
          onConfirm={handleValider}
          okText="Oui"
          cancelText="Non"
        >
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={loading}
          >
            {isDemandeur ? "Confirmer" : "Valider"}
          </Button>
        </Popconfirm>
      )}

      {/* ── Bouton Rejeter ── */}
      {canRejeter && (
        <>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setMotif("");
              setMR_No(0);
              setShowRefusModal(true);
            }}
          >
            Rejeter
          </Button>

          <Modal
            title="Motif de refus"
            open={showRefusModal}
            onCancel={() => setShowRefusModal(false)}
            onOk={handleRefus}
            okText="Confirmer le refus"
            okButtonProps={{ danger: true, disabled: !motif.trim() }}
          >
            {motifsRefus.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Type de motif</label>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Choisir un motif..."
                  onChange={(v) => setMR_No(v)}
                >
                  {motifsRefus.map((m) => (
                    <Select.Option key={m.MR_No} value={m.MR_No}>
                      {m.MR_Intitule}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}
            <label className="block text-sm font-medium mb-1">Motif *</label>
            <TextArea
              rows={4}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Saisir le motif de refus..."
            />
            {error && <Alert type="error" message={error} className="mt-2" />}
          </Modal>
        </>
      )}

      {/* ── Bouton Rectifier ── */}
      {canRectifier && (
        <>
          <Button
            icon={<RetweetOutlined />}
            onClick={() => {
              setMotif("");
              setMR_No(0);
              setShowRectifModal(true);
            }}
          >
            Rectifier
          </Button>

          <Modal
            title="Demande de rectification"
            open={showRectifModal}
            onCancel={() => setShowRectifModal(false)}
            onOk={handleRectifier}
            okText="Envoyer la rectification"
            okButtonProps={{
              disabled: !motif.trim() || (motifsRefus.length > 0 && !mR_No),
            }}
          >
            {motifsRefus.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Type de motif *
                </label>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Choisir un type de rectification..."
                  onChange={(v) => setMR_No(v)}
                >
                  {motifsRefus.map((m) => (
                    <Select.Option key={m.MR_No} value={m.MR_No}>
                      {m.MR_Intitule}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}
            <label className="block text-sm font-medium mb-1">Motif *</label>
            <TextArea
              rows={4}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Saisir le motif de rectification..."
            />
            {error && <Alert type="error" message={error} className="mt-2" />}
          </Modal>
        </>
      )}
    </div>
  );
};

export default ValidationAction;