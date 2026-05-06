import {
	Add as AddIcon,
	Close as CloseIcon,
	FileDownload as FileDownloadIcon,
	InfoOutlined as InfoIcon,
	Refresh as RefreshIcon,
	VisibilityOutlined as VisibilityIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import type { GridColDef, GridRowParams } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import BesoinValidationPage from "@/pages/besoin/BesoinValidationPage";
import * as besoinService from "@/services/besoinservice";
import { useBesoinStore } from "@/store/useBesoinStore";
import { Etat_Besoin, type IBesoin, Type_Validation, type Validateur_BesoinVM } from "@/types/besoin";
import {
	ETAT_BESOIN_LABELS,
	formatDate,
	formatDateTime,
	getEtatBesoinProgressBar,
	ROLE_VALIDATEUR_LABELS,
	STATUT_LABELS,
} from "@/utils/besoin.utils";

dayjs.locale("fr");

// ─── Couleurs statut (miroir MVC) ────────────────────────────────────────────
const STATUT_COLORS: Record<number, { bg: string; text: string }> = {
	0: { bg: "#6c757d", text: "#fff" },   // En Attente
	1: { bg: "#dc3545", text: "#fff" },   // Rejeté
	2: { bg: "#17a2b8", text: "#fff" },   // Partiel
	3: { bg: "#28a745", text: "#fff" },   // Validé
	4: { bg: "#ffc107", text: "#000" },   // Attente achat
	5: { bg: "#007bff", text: "#fff" },   // Achetée
	6: { bg: "#dc3545", text: "#fff" },   // Rectification
};

const ROLE_COLORS: Record<number, string> = {
	1: "#6c757d",   // Demandeur
	2: "#17a2b8",   // Responsable hiérarchique
	3: "#28a745",   // Validateur
	4: "#007bff",   // Acheteur
};

// ─────────────────────────────────────────────────────────────────────────────

const STYLES = `
  .besoin-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    background: #f4f6f9;
    padding: 12px;
    box-sizing: border-box;
  }
  .besoin-card {
    flex: 1;
    min-height: 0;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
  .besoin-grid { flex: 1; min-height: 0; }
`;

interface Props {
	onEdit: (b_No: number) => void;
	onView: (b_No: number) => void;
	onNew: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const asRecord = (row: IBesoin): Record<string, unknown> => row as Record<string, unknown>;
const getBesoinId = (row: IBesoin): number => Number(asRecord(row).b_No ?? asRecord(row).B_No ?? 0);

const readChampLibreCell = (row: IBesoin, key: string): string => {
	const r = asRecord(row);
	const bag = r.ChampsLibres ?? r.champsLibres;
	if (bag && typeof bag === "object" && !Array.isArray(bag)) {
		const v = (bag as Record<string, unknown>)[key];
		if (v != null && v !== "") return String(v);
	}
	const dotted = r[`ChampsLibres.${key}`];
	if (dotted != null && dotted !== "") return String(dotted);
	const direct = r[key];
	return direct != null && direct !== "" ? String(direct) : "—";
};

const str = (v: unknown): string => (v == null ? "—" : String(v) || "—");

// ─────────────────────────────────────────────────────────────────────────────
// Dialog récap validation
// ─────────────────────────────────────────────────────────────────────────────

interface RecapDialogProps {
	open: boolean;
	besoinNumero: string;
	besoinNo: number;
	bT_Id: number;
	onClose: () => void;
}

function RecapValidationDialog({ open, besoinNumero, besoinNo, bT_Id, onClose }: RecapDialogProps) {
	const [rows, setRows] = useState<Validateur_BesoinVM[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !besoinNo) return;
		setLoading(true);
		besoinService
			.getHistoriqueValidation({ B_No: besoinNo, BT_Id: bT_Id } as Validateur_BesoinVM, 0 as never)
			.then((res) => setRows(Array.isArray(res.data) ? res.data : []))
			.catch(() => toast.error("Impossible de charger le récap."))
			.finally(() => setLoading(false));
	}, [open, besoinNo, bT_Id]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle
				sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5 }}
			>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Récap de validation — Demande N° {besoinNumero}
				</Typography>
				<IconButton size="small" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</DialogTitle>

			<DialogContent dividers sx={{ p: 0 }}>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress size={32} />
					</Box>
				) : rows.length === 0 ? (
					<Box sx={{ py: 4, textAlign: "center" }}>
						<Typography color="text.secondary">Aucun enregistrement trouvé.</Typography>
					</Box>
				) : (
					<Table size="small" stickyHeader>
						<TableHead>
							<TableRow>
								<TableCell sx={{ fontWeight: 700 }}>Utilisateur</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Rôle</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Date notification</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Date validation</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
								<TableCell sx={{ fontWeight: 700 }}>Motif</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map((row, i) => {
								const status = Number(row.V_Status ?? row.v_Status ?? -1);
								const role = Number(row.V_Role_Validateur ?? row.v_Role_Validateur ?? -1);
								const statutColor = STATUT_COLORS[status];
								const roleColor = ROLE_COLORS[role] ?? "#6c757d";
								const notifDate = formatDateTime(String(row.NU_DateTime ?? row.nU_DateTime ?? ""));
								const valDate = formatDate(String(row.V_ValidationDate ?? row.v_ValidationDate ?? ""));
								const motif = String(row.V_Motif ?? row.v_Motif ?? "");
								const label = String(row.US_UserIntitule ?? row.uS_UserIntitule ?? `—`);
								const rowKey = String(row.V_Id ?? row.v_Id ?? i);

								return (
									<TableRow key={rowKey} hover>
										<TableCell>{label}</TableCell>
										<TableCell>
											<Chip
												label={ROLE_VALIDATEUR_LABELS[role] ?? "—"}
												size="small"
												sx={{
													bgcolor: roleColor,
													color: "#fff",
													fontWeight: 600,
													fontSize: 11,
												}}
											/>
										</TableCell>
										<TableCell sx={{ fontSize: 12 }}>{notifDate || "—"}</TableCell>
										<TableCell sx={{ fontSize: 12 }}>{valDate || "—"}</TableCell>
										<TableCell>
											{statutColor ? (
												<Chip
													label={STATUT_LABELS[status] ?? String(status)}
													size="small"
													sx={{
														bgcolor: statutColor.bg,
														color: statutColor.text,
														fontWeight: 600,
														fontSize: 11,
													}}
												/>
											) : (
												<span>{status}</span>
											)}
										</TableCell>
										<TableCell sx={{ fontSize: 12, maxWidth: 160 }}>
											<Tooltip title={motif} placement="top">
												<span
													style={{
														display: "block",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
														maxWidth: 150,
													}}
												>
													{motif || "—"}
												</span>
											</Tooltip>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function BesoinList({ onEdit, onView, onNew }: Props) {
	const {
		besoins,
		totalCount,
		loading,
		filter,
		setFilter,
		fetchBesoins,
		setSelectedId,
		selectedId,
		champsLibreColumnKeys,
	} = useBesoinStore();

	const [rangeValue, setRangeValue] = useState<[Dayjs, Dayjs] | null>(() => {
		const start = filter.dateDebut ? dayjs(String(filter.dateDebut)) : dayjs().startOf("isoWeek");
		const end = filter.dateFin ? dayjs(String(filter.dateFin)) : dayjs().endOf("isoWeek");
		return [start, end];
	});

	// Modal validation (👁 eye icon)
	const [validationModal, setValidationModal] = useState<{
		open: boolean;
		besoinId: number;
		validationId: number;
		besoinNumero: string;
		loadingVid: boolean;
	}>({ open: false, besoinId: 0, validationId: 0, besoinNumero: "", loadingVid: false });

	const openValidationModal = useCallback(async (row: IBesoin) => {
		const r = asRecord(row);
		const bNo = Number(r.b_No ?? r.B_No ?? 0);
		const numero = String(r.b_Numero ?? r.B_Numero ?? "");
		if (!bNo) return;

		setValidationModal((prev) => ({ ...prev, open: true, besoinId: bNo, validationId: 0, besoinNumero: numero, loadingVid: true }));
		try {
			const vId = await besoinService.getStatutUserBesoin(bNo, Type_Validation.Demande_Besoin);
			setValidationModal((prev) => ({ ...prev, validationId: vId ?? 0, loadingVid: false }));
		} catch {
			setValidationModal((prev) => ({ ...prev, loadingVid: false }));
		}
	}, []);

	// Dialog récap
	const [recap, setRecap] = useState<{
		open: boolean;
		numero: string;
		besoinNo: number;
		bT_Id: number;
	}>({ open: false, numero: "", besoinNo: 0, bT_Id: 0 });

	useEffect(() => {
		const start = filter.dateDebut ? dayjs(String(filter.dateDebut)) : dayjs().startOf("isoWeek");
		const end = filter.dateFin ? dayjs(String(filter.dateFin)) : dayjs().endOf("isoWeek");
		setRangeValue([start, end]);
	}, [filter.dateDebut, filter.dateFin]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: filter properties trigger refetch
	useEffect(() => {
		void fetchBesoins();
	}, [
		fetchBesoins,
		filter.pageIndex,
		filter.pageSize,
		filter.b_Numero,
		filter.b_Titre,
		filter.b_Demandeur,
		filter.b_Etat_Besoin,
		filter.B_Etat_Besoin,
		filter.dateDebut,
		filter.dateFin,
	]);

	const openRecap = useCallback((row: IBesoin) => {
		const r = asRecord(row);
		setRecap({
			open: true,
			numero: String(r.b_Numero ?? r.B_Numero ?? ""),
			besoinNo: Number(r.b_No ?? r.B_No ?? 0),
			bT_Id: Number(r.bT_Id ?? r.BT_Id ?? 0),
		});
	}, []);

	const handleExportExcel = async () => {
		try {
			const response = await besoinService.exportBesoinExcel(filter);
			const fileName =
				(response.headers["file-name"] as string | undefined) ||
				`Liste_Demandes_Besoin_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;
			const url = URL.createObjectURL(response.data);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = fileName;
			anchor.click();
			URL.revokeObjectURL(url);
			toast.success("Fichier téléchargé.");
		} catch (error) {
			console.error("Erreur export Excel", error);
			toast.error("Échec de l'export Excel.");
		}
	};

	const handleNewClick = async () => {
		try {
			const res = await besoinService.existTypeBesoinUser();
			const valid = res.isValid !== false && res.IsValid !== false;
			const msg = res.Message ?? res.message;
			if (!valid) {
				toast.error(msg?.trim() || "Action non autorisée.");
				return;
			}
			const exist = res.exist_Type_Besoin ?? res.Exist_Type_Besoin;
			if (!exist) {
				toast.error("Aucun type de besoin autorisé pour créer une demande.");
				return;
			}
			onNew();
		} catch {
			toast.error("Impossible de vérifier les droits de création.");
		}
	};

	const columns = useMemo((): GridColDef<IBesoin>[] => {
		const base: GridColDef<IBesoin>[] = [
			{
				field: "b_Numero",
				headerName: "Numéro",
				width: 100,
				renderCell: (params): React.ReactNode => {
					const num = str(asRecord(params.row).b_Numero ?? asRecord(params.row).B_Numero);
					return (
						<button
							type="button"
							style={{
								cursor: "pointer",
								border: "none",
								background: "transparent",
								padding: 0,
								fontWeight: 600,
								color: "#e2552d",
								textDecoration: "underline",
							}}
							onClick={(e) => {
								e.stopPropagation();
								onEdit(getBesoinId(params.row));
							}}
						>
							{num}
						</button>
					);
				},
			},
			{
				field: "b_Titre",
				headerName: "Titre",
				width: 160,
				renderCell: (params): React.ReactNode =>
					str(asRecord(params.row).b_Titre ?? asRecord(params.row).B_Titre),
			},
			{
				field: "b_Date",
				headerName: "Date création",
				width: 120,
				renderCell: (params): React.ReactNode => {
					const v = asRecord(params.row).b_Date ?? asRecord(params.row).B_Date;
					return v ? new Date(String(v)).toLocaleDateString("fr-FR") : "—";
				},
			},
			{
				field: "b_Demandeur",
				headerName: "Demandeur",
				width: 120,
				renderCell: (params): React.ReactNode =>
					str(asRecord(params.row).b_Demandeur ?? asRecord(params.row).B_Demandeur),
			},
			{
				field: "cA_Intitule",
				headerName: "Affaire",
				width: 140,
				renderCell: (params): React.ReactNode =>
					str(asRecord(params.row).cA_Intitule ?? asRecord(params.row).CA_Intitule),
			},
			{
				field: "dE_Intitule",
				headerName: "Dépôt",
				width: 120,
				renderCell: (params): React.ReactNode =>
					str(asRecord(params.row).dE_Intitule ?? asRecord(params.row).DE_Intitule),
			},
			{
				field: "b_Etat_Besoin",
				headerName: "État",
				width: 170,
				renderCell: (params): React.ReactNode => {
					const etat = Number(params.value);
					const label = ETAT_BESOIN_LABELS[etat] ?? `État ${etat}`;
					const { widthPct, barColor } = getEtatBesoinProgressBar(etat);
					return (
						<Box sx={{ minWidth: 110, py: 0.5 }}>
							<Typography variant="caption" sx={{ fontWeight: 600, display: "block", lineHeight: 1.2 }}>
								{label}
							</Typography>
							<Box sx={{ mt: 0.5, height: 4, overflow: "hidden", borderRadius: 0.5, bgcolor: "#e1e1e1" }}>
								<Box
									sx={{
										height: "100%",
										transition: "width 0.5s",
										width: `${widthPct}%`,
										bgcolor: barColor,
										borderRadius: 0.5,
									}}
								/>
							</Box>
						</Box>
					);
				},
			},
		];

		const dynamiques: GridColDef<IBesoin>[] = champsLibreColumnKeys.map((key) => ({
			field: `cl_${key}`,
			headerName: key,
			width: 120,
			renderCell: (params): React.ReactNode => readChampLibreCell(params.row, key) || "—",
		}));

		const actions: GridColDef<IBesoin>[] = [
			{
				field: "actions",
				headerName: " ",
				width: 88,
				sortable: false,
				filterable: false,
				renderCell: (params): React.ReactNode => (
					<Stack direction="row" spacing={0.5} sx={{ alignItems: "center", height: "100%" }}>
						<Tooltip title="Ouvrir validation">
							<IconButton
								size="small"
								color="primary"
								onClick={(e) => {
									e.stopPropagation();
									void openValidationModal(params.row);
								}}
							>
								<VisibilityIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Récap de validation">
							<IconButton
								size="small"
								onClick={(e) => {
									e.stopPropagation();
									openRecap(params.row);
								}}
							>
								<InfoIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Stack>
				),
			},
		];

		return [...base, ...dynamiques, ...actions];
	}, [champsLibreColumnKeys, onEdit, openRecap, openValidationModal]);

	const onRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
		if (!dates || !dates[0] || !dates[1]) return;
		setRangeValue([dates[0], dates[1]]);
		setFilter({
			dateDebut: dates[0].format("YYYY-MM-DD"),
			dateFin: dates[1].format("YYYY-MM-DD"),
		});
	};

	return (
		<>
			<style>{STYLES}</style>
			<div className="besoin-page">
				<Box
					sx={{
						display: "flex",
						flexDirection: "column",
						gap: 0.5,
						borderBottom: 1,
						borderColor: "divider",
						pb: 1.5,
						mb: 2,
					}}
				>
					<Typography variant="h5" sx={{ mb: 0 }}>
						Demandes de besoin
					</Typography>
				</Box>

				<Stack
					spacing={2}
					sx={{
						flexDirection: { xs: "column", lg: "row" },
						alignItems: { lg: "flex-end" },
						justifyContent: "space-between",
					}}
				>
					<Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
						<FormControl size="small" sx={{ minWidth: 100 }}>
							<InputLabel>Lignes</InputLabel>
							<Select
								value={filter.pageSize ?? 20}
								label="Lignes"
								onChange={(e) => setFilter({ pageSize: Number(e.target.value) })}
							>
								{PAGE_SIZE_OPTIONS.map((n) => (
									<MenuItem key={n} value={n}>
										{n}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<Stack spacing={0.5}>
							<Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>
								Période
							</Typography>
							<Stack direction="row" spacing={1}>
								<TextField
									type="date"
									size="small"
									value={rangeValue?.[0]?.format("YYYY-MM-DD") ?? ""}
									onChange={(e) => {
										const start = e.target.value ? dayjs(e.target.value) : null;
										if (start && rangeValue?.[1]) onRangeChange([start, rangeValue[1]]);
									}}
								/>
								<TextField
									type="date"
									size="small"
									value={rangeValue?.[1]?.format("YYYY-MM-DD") ?? ""}
									onChange={(e) => {
										const end = e.target.value ? dayjs(e.target.value) : null;
										if (end && rangeValue?.[0]) onRangeChange([rangeValue[0], end]);
									}}
								/>
							</Stack>
						</Stack>

						<TextField
							placeholder="Numéro"
							size="small"
							sx={{ width: 120 }}
							value={String(filter.b_Numero ?? filter.B_Numero ?? "")}
							onChange={(e) => setFilter({ b_Numero: e.target.value })}
						/>
						<TextField
							placeholder="Titre"
							size="small"
							sx={{ width: 160 }}
							value={String(filter.b_Titre ?? filter.B_Titre ?? "")}
							onChange={(e) => setFilter({ b_Titre: e.target.value })}
						/>
						<TextField
							placeholder="Demandeur"
							size="small"
							sx={{ width: 140 }}
							value={String(filter.b_Demandeur ?? filter.B_Demandeur ?? "")}
							onChange={(e) => setFilter({ b_Demandeur: e.target.value })}
						/>

						<FormControl size="small" sx={{ minWidth: 220 }}>
							<InputLabel>État</InputLabel>
							<Select
								value={Number(filter.b_Etat_Besoin ?? filter.B_Etat_Besoin ?? Etat_Besoin.Tous)}
								label="État"
								onChange={(e) => setFilter({ b_Etat_Besoin: e.target.value as number })}
							>
								{Object.entries(ETAT_BESOIN_LABELS).map(([key, label]) => (
									<MenuItem key={key} value={Number(key)}>
										{label}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<Button
							variant="outlined"
							startIcon={<RefreshIcon />}
							onClick={() => void fetchBesoins()}
							size="small"
						>
							Actualiser
						</Button>
					</Stack>

					<Stack direction="row" spacing={1}>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={() => void handleNewClick()}
							size="small"
						>
							Nouveau
						</Button>
						<Button
							variant="outlined"
							disabled={!selectedId}
							onClick={() => {
								if (selectedId) onEdit(selectedId);
								else toast.warning("Sélectionnez une ligne.");
							}}
							size="small"
						>
							Détails
						</Button>
						<Button
							variant="outlined"
							startIcon={<FileDownloadIcon />}
							onClick={() => void handleExportExcel()}
							size="small"
						>
							Exporter
						</Button>
					</Stack>
				</Stack>

				<div className="besoin-card">
					<Box className="besoin-grid">
						<DataGrid
							rows={besoins}
							columns={columns}
							loading={loading}
							rowCount={totalCount}
							paginationMode="server"
							getRowId={(row) => getBesoinId(row)}
							onPaginationModelChange={({ page, pageSize }) =>
								setFilter({ pageIndex: page + 1, pageSize })
							}
							onRowClick={(params: GridRowParams<IBesoin>) => {
								setSelectedId(getBesoinId(params.row));
							}}
							onRowDoubleClick={(params: GridRowParams<IBesoin>) => {
								onEdit(getBesoinId(params.row));
							}}
							sx={{
								"& .MuiDataGrid-row.Mui-selected": { bgcolor: "#c4e2ff" },
								"& .MuiDataGrid-row.Mui-selected:hover": { bgcolor: "#b0d4f5" },
							}}
							disableRowSelectionOnClick={false}
							density="compact"
							rowHeight={46}
							slots={{
								noRowsOverlay: () => (
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											height: "100%",
										}}
									>
										<Typography color="text.secondary">Aucune donnée</Typography>
									</Box>
								),
							}}
						/>
					</Box>
				</div>
			</div>

			{/* Dialog récap validation */}
			<RecapValidationDialog
				open={recap.open}
				besoinNumero={recap.numero}
				besoinNo={recap.besoinNo}
				bT_Id={recap.bT_Id}
				onClose={() => setRecap((prev) => ({ ...prev, open: false }))}
			/>

			{/* ── Modal Validation (👁 eye icon) ── */}
			<Dialog
				open={validationModal.open}
				onClose={() => setValidationModal((p) => ({ ...p, open: false }))}
				maxWidth="lg"
				fullWidth
				PaperProps={{ sx: { maxHeight: "92vh" } }}
			>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						py: 1,
						px: 2,
						borderBottom: "1px solid #e0e0e0",
					}}
				>
					<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
						Validation — {validationModal.besoinNumero || `Besoin #${validationModal.besoinId}`}
					</Typography>
					<IconButton
						size="small"
						onClick={() => setValidationModal((p) => ({ ...p, open: false }))}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</DialogTitle>

				<DialogContent sx={{ p: 0, overflow: "auto" }}>
					{validationModal.loadingVid ? (
						<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
							<CircularProgress size={36} />
						</Box>
					) : (
						<BesoinValidationPage
							validationId={validationModal.validationId}
							besoinId={validationModal.besoinId}
							onBack={() => {
								setValidationModal((p) => ({ ...p, open: false }));
								void fetchBesoins();
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
