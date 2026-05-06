import {
	Cancel as CancelIcon,
	FileDownload as FileDownloadIcon,
	Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	deleteAffectation,
	exportDemandesAAcheterExcel,
	getDemandesAAcheter,
} from "@/services/besoinservice";
import {
	Etat_Affectation_Acheteur,
	Type_Validation,
	TypeSage,
	type DA_BESOIN_AACHETERDto,
} from "@/types/besoin";

type Props = {
	onOpenDetail: (bNo: number, tpNo: number) => void;
};

const asRecord = (v: unknown): Record<string, unknown> =>
	v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const asNumber = (v: unknown): number => {
	if (typeof v === "number") return v;
	const n = Number(v);
	return Number.isNaN(n) ? 0 : n;
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const affectationStateUi: Record<number, { label: string; width: number; color: string }> = {
	[Etat_Affectation_Acheteur.Brouillon]: { label: "Brouillon", width: 10, color: "#6c757d" },
	[Etat_Affectation_Acheteur.Encours]: { label: "En cours", width: 20, color: "#fd7e14" },
	[Etat_Affectation_Acheteur.Generer_Demande]: { label: "Générer demande", width: 40, color: "#0d6efd" },
	[Etat_Affectation_Acheteur.Acheter]: { label: "Achetée", width: 70, color: "#198754" },
	[Etat_Affectation_Acheteur.Valider]: { label: "Validée", width: 95, color: "#198754" },
};

export default function BesoinGestionDemandesPage({ onOpenDetail }: Props) {
	const [rows, setRows] = useState<DA_BESOIN_AACHETERDto[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [selectedId, setSelectedId] = useState<number>(0);
	const [selected, setSelected] = useState<Record<string, unknown>>({});
	const [range, setRange] = useState<[Dayjs, Dayjs]>([
		dayjs().startOf("isoWeek"),
		dayjs().endOf("isoWeek"),
	]);
	const [filter, setFilter] = useState({
		pageIndex: 1,
		pageSize: 10,
		B_Etat_Affectation_Acheteur: -1,
		B_TypeDocument: 0,
		AD_TypeDemande: 0,
		dateDebut: dayjs().startOf("isoWeek").format("YYYY-MM-DD"),
		dateFin: dayjs().endOf("isoWeek").format("YYYY-MM-DD"),
	});
	const [champsLibreKeys, setChampsLibreKeys] = useState<string[]>([]);
	const [cancelDialog, setCancelDialog] = useState(false);
	const [cancelling, setCancelling] = useState(false);

	// ── Chargement données ────────────────────────────────────────────────────

	const loadData = async (): Promise<void> => {
		setLoading(true);
		try {
			const res = await getDemandesAAcheter(filter);
			setRows(Array.isArray(res.data) ? res.data : []);
			setTotal(res.itemsCount || 0);
			const meta = asRecord(
				(res as unknown as Record<string, unknown>).ChampsLibres ??
				(res as unknown as Record<string, unknown>).champsLibres,
			);
			if (Object.keys(meta).length) setChampsLibreKeys(Object.keys(meta));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Erreur chargement demandes.");
		} finally {
			setLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: filter properties trigger refetch
	useEffect(() => {
		void loadData();
	}, [
		filter.pageIndex,
		filter.pageSize,
		filter.B_Etat_Affectation_Acheteur,
		filter.B_TypeDocument,
		filter.AD_TypeDemande,
		filter.dateDebut,
		filter.dateFin,
	]);

	// ── Ouverture détail ──────────────────────────────────────────────────────

	const openAffectation = async (item: Record<string, unknown>): Promise<void> => {
		const bNo = asNumber(item.b_No ?? item.B_No);
		const typeDocument =
			asNumber(item.b_TypeDocument ?? item.B_TypeDocument ?? item.tP_No ?? item.TP_No) ||
			TypeSage.Demande_Achat;
		if (!bNo || bNo <= 0) {
			toast.error("ID besoin invalide.");
			return;
		}
		onOpenDetail(bNo, typeDocument);
	};

	// ── Annuler demande ───────────────────────────────────────────────────────

	const handleAnnulerConfirm = async (): Promise<void> => {
		if (!selectedId) return;
		setCancelling(true);
		try {
			// aD_No = 0 → supprime toutes les affectations de la demande
			await deleteAffectation(0, selectedId);
			toast.success("Demande annulée.");
			setCancelDialog(false);
			setSelectedId(0);
			setSelected({});
			await loadData();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Erreur lors de l'annulation.");
		} finally {
			setCancelling(false);
		}
	};

	// ── Colonnes ──────────────────────────────────────────────────────────────

	// biome-ignore lint/correctness/useExhaustiveDependencies: filter not needed as dep
	const columns = useMemo((): GridColDef<DA_BESOIN_AACHETERDto>[] => {
		const base: GridColDef<DA_BESOIN_AACHETERDto>[] = [
			{
				field: "b_Numero",
				headerName: "Numéro",
				width: 100,
				renderCell: (params): React.ReactNode => {
					const r = asRecord(params.row);
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
								e.preventDefault();
								void openAffectation(r);
							}}
						>
							{asString(r.b_Numero) || "—"}
						</button>
					);
				},
			},
			{ field: "b_Titre", headerName: "Titre", width: 160 },
			{
				field: "b_Date",
				headerName: "Date création",
				width: 115,
				renderCell: (params): React.ReactNode => {
					const v = asRecord(params.row).b_Date ?? asRecord(params.row).B_Date;
					return v ? new Date(String(v)).toLocaleDateString("fr-FR") : "—";
				},
			},
			{ field: "b_Demandeur", headerName: "Demandeur", width: 130 },
			{ field: "cA_Intitule", headerName: "Affaire", width: 130 },
			{ field: "dE_Intitule", headerName: "Dépôt", width: 110 },
			{
				field: "b_Etat_Affectation_Acheteur",
				headerName: "État",
				width: 165,
				renderCell: (params): React.ReactNode => {
					const etat = asNumber(params.value);
					const ui = affectationStateUi[etat];
					if (!ui) return <span>{etat}</span>;
					return (
						<Box sx={{ minWidth: 120, py: 0.5 }}>
							<Typography variant="caption" sx={{ fontWeight: 600, display: "block", lineHeight: 1.2 }}>
								{ui.label}
							</Typography>
							<Box sx={{ mt: 0.5, height: 4, overflow: "hidden", borderRadius: 0.5, bgcolor: "#e1e1e1" }}>
								<Box
									sx={{
										height: "100%",
										transition: "width 0.5s",
										width: `${ui.width}%`,
										bgcolor: ui.color,
										borderRadius: 0.5,
									}}
								/>
							</Box>
						</Box>
					);
				},
			},
			{
				field: "b_TypeDocument",
				headerName: "Type document",
				width: 130,
				renderCell: (params): React.ReactNode =>
					asNumber(params.value) === TypeSage.BC_Achat ? "Bon de commande" : "Demande de prix",
			},
			{
				field: "aD_TypeDemande",
				headerName: "Type demande",
				width: 140,
				renderCell: (params): React.ReactNode =>
					asNumber(params.value) === Type_Validation.Retour_Demande_Validation
						? "Retour demande"
						: "Demande besoin",
			},
		];

		const dynCols: GridColDef<DA_BESOIN_AACHETERDto>[] = champsLibreKeys.map((key) => ({
			field: `cl_${key}`,
			headerName: key,
			width: 120,
			renderCell: (params): React.ReactNode => {
				const bag = asRecord(
					asRecord(params.row).ChampsLibres ?? asRecord(params.row).champsLibres,
				);
				return asString(bag[key]) || "—";
			},
		}));

		const actionsCol: GridColDef<DA_BESOIN_AACHETERDto> = {
			field: "actions",
			headerName: " ",
			width: 72,
			sortable: false,
			filterable: false,
			renderCell: (params): React.ReactNode => (
				<Button
					size="small"
					onClick={(e) => {
						e.stopPropagation();
						void openAffectation(asRecord(params.row));
					}}
				>
					Détails
				</Button>
			),
		};

		return [...base, ...dynCols, actionsCol];
	}, [champsLibreKeys]);

	// ── Rendu ─────────────────────────────────────────────────────────────────

	return (
		<Box sx={{ mx: "auto", maxWidth: 1450, px: 2, py: 2 }}>
			{/* Titre + actions globales */}
			<Stack
				direction="row"
				spacing={2}
				sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
			>
				<Typography variant="h5">Gestion des demandes</Typography>

				<Stack direction="row" spacing={1}>
					<Button
						variant="outlined"
						size="small"
						disabled={!selectedId}
						onClick={() => {
							if (!selectedId) { toast.error("Aucune ligne sélectionnée."); return; }
							void openAffectation(selected);
						}}
					>
						Détails
					</Button>

					<Button
						variant="outlined"
						color="error"
						size="small"
						startIcon={<CancelIcon />}
						disabled={!selectedId}
						onClick={() => {
							if (!selectedId) { toast.error("Aucune ligne sélectionnée."); return; }
							setCancelDialog(true);
						}}
					>
						Annuler
					</Button>

					<Button
						variant="outlined"
						size="small"
						startIcon={<FileDownloadIcon />}
						onClick={async () => {
							try {
								const response = await exportDemandesAAcheterExcel(filter);
								const fileName =
									(response.headers["file-name"] as string | undefined) ||
									`Liste_Demandes_AAcheter_${new Date().toISOString().slice(0, 10)}.xlsx`;
								const url = URL.createObjectURL(response.data);
								const a = document.createElement("a");
								a.href = url;
								a.download = fileName;
								a.click();
								URL.revokeObjectURL(url);
							} catch {
								toast.error("Erreur export.");
							}
						}}
					>
						Exporter
					</Button>
				</Stack>
			</Stack>

			{/* Filtres */}
			<Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "flex-end", mb: 2 }}>
				<FormControl size="small" sx={{ minWidth: 90 }}>
					<InputLabel>Lignes</InputLabel>
					<Select
						value={filter.pageSize}
						label="Lignes"
						onChange={(e) =>
							setFilter((p) => ({ ...p, pageSize: Number(e.target.value), pageIndex: 1 }))
						}
					>
						{[10, 20, 50, 100].map((v) => (
							<MenuItem key={v} value={v}>{v}</MenuItem>
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
							value={range[0].format("YYYY-MM-DD")}
							onChange={(e) => {
								const start = e.target.value ? dayjs(e.target.value) : null;
								if (!start) return;
								setRange([start, range[1]]);
								setFilter((p) => ({ ...p, dateDebut: start.format("YYYY-MM-DD"), pageIndex: 1 }));
							}}
						/>
						<TextField
							type="date"
							size="small"
							value={range[1].format("YYYY-MM-DD")}
							onChange={(e) => {
								const end = e.target.value ? dayjs(e.target.value) : null;
								if (!end) return;
								setRange([range[0], end]);
								setFilter((p) => ({ ...p, dateFin: end.format("YYYY-MM-DD"), pageIndex: 1 }));
							}}
						/>
					</Stack>
				</Stack>

				<FormControl size="small" sx={{ minWidth: 170 }}>
					<InputLabel>État</InputLabel>
					<Select
						value={filter.B_Etat_Affectation_Acheteur}
						label="État"
						onChange={(e) =>
							setFilter((p) => ({ ...p, B_Etat_Affectation_Acheteur: Number(e.target.value), pageIndex: 1 }))
						}
					>
						<MenuItem value={-1}>Tous états</MenuItem>
						<MenuItem value={0}>Brouillon</MenuItem>
						<MenuItem value={1}>En cours</MenuItem>
						<MenuItem value={2}>Générer demande</MenuItem>
						<MenuItem value={3}>Achetée</MenuItem>
						<MenuItem value={4}>Validée</MenuItem>
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 170 }}>
					<InputLabel>Type document</InputLabel>
					<Select
						value={filter.B_TypeDocument}
						label="Type document"
						onChange={(e) =>
							setFilter((p) => ({ ...p, B_TypeDocument: Number(e.target.value), pageIndex: 1 }))
						}
					>
						<MenuItem value={0}>Tous documents</MenuItem>
						<MenuItem value={TypeSage.Demande_Achat}>Demande de prix</MenuItem>
						<MenuItem value={TypeSage.BC_Achat}>Bon de commande</MenuItem>
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 190 }}>
					<InputLabel>Type demande</InputLabel>
					<Select
						value={filter.AD_TypeDemande}
						label="Type demande"
						onChange={(e) =>
							setFilter((p) => ({ ...p, AD_TypeDemande: Number(e.target.value), pageIndex: 1 }))
						}
					>
						<MenuItem value={Type_Validation.Demande_Besoin}>Demande besoin</MenuItem>
						<MenuItem value={Type_Validation.Retour_Demande_Validation}>Retour demande</MenuItem>
					</Select>
				</FormControl>

				<Button
					variant="outlined"
					startIcon={<RefreshIcon />}
					onClick={() => void loadData()}
					size="small"
				>
					Actualiser
				</Button>
			</Stack>

			{/* Grille */}
			<Box sx={{ height: 520 }}>
				<DataGrid
					rows={rows}
					columns={columns}
					loading={loading}
					rowCount={total}
					paginationMode="server"
					onPaginationModelChange={({ page, pageSize }) =>
						setFilter((p) => ({ ...p, pageIndex: page + 1, pageSize }))
					}
					getRowId={(row) => asNumber(asRecord(row).B_No ?? asRecord(row).b_No)}
					onRowClick={({ row }) => {
						const r = asRecord(row);
						setSelectedId(asNumber(r.B_No ?? r.b_No));
						setSelected(r);
					}}
					onRowDoubleClick={({ row }) => void openAffectation(asRecord(row))}
					density="compact"
					rowHeight={46}
					sx={{
						"& .MuiDataGrid-row.Mui-selected": { bgcolor: "#c4e2ff" },
						"& .MuiDataGrid-row.Mui-selected:hover": { bgcolor: "#b0d4f5" },
					}}
					slots={{
						noRowsOverlay: () => (
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
								<Typography color="text.secondary">Aucune donnée</Typography>
							</Box>
						),
					}}
				/>
			</Box>

			{/* Dialog confirmation annulation */}
			<Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Annuler la demande</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Êtes-vous sûr de vouloir annuler toutes les affectations de cette demande ?
						Cette action supprimera les lignes d'affectation associées.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCancelDialog(false)} disabled={cancelling}>
						Non
					</Button>
					<Button
						color="error"
						variant="contained"
						onClick={() => void handleAnnulerConfirm()}
						disabled={cancelling}
					>
						{cancelling ? "Annulation..." : "Oui, annuler"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
