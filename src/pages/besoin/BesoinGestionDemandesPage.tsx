import { FileDownload as FileDownloadIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import {
	Box,
	Button,
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
	exportDemandesAAcheterExcel,
	getDemandesAAcheter,
} from "@/services/besoinservice";
import { Etat_Affectation_Acheteur, Type_Validation, TypeSage, type DA_BESOIN_AACHETERDto } from "@/types/besoin";

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
	const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("isoWeek"), dayjs().endOf("isoWeek")]);
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

	const loadData = async (): Promise<void> => {
		setLoading(true);
		try {
			const res = await getDemandesAAcheter(filter);
			setRows(Array.isArray(res.data) ? res.data : []);
			setTotal(res.itemsCount || 0);
			const meta = asRecord((res as unknown as Record<string, unknown>).ChampsLibres ?? (res as unknown as Record<string, unknown>).champsLibres);
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
	}, [filter.pageIndex, filter.pageSize, filter.B_Etat_Affectation_Acheteur, filter.B_TypeDocument, filter.AD_TypeDemande, filter.dateDebut, filter.dateFin]);

	const openAffectation = async (item: Record<string, unknown>): Promise<void> => {
		const bNo = asNumber(item.b_No ?? item.B_No ?? item.b_No);
		const typeDocument = asNumber(item.b_TypeDocument ?? item.B_TypeDocument ?? item.tP_No ?? item.TP_No) || TypeSage.Demande_Achat;

		if (!bNo || bNo <= 0) {
			toast.error("ID besoin invalide");
			return;
		}

		onOpenDetail(bNo, typeDocument);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: filter properties trigger refetch
	const columns = useMemo((): GridColDef<DA_BESOIN_AACHETERDto>[] => {
		const base: GridColDef<DA_BESOIN_AACHETERDto>[] = [
			{
				field: "b_Numero",
				headerName: "Numéro",
				width: 100,
				renderCell: (params) => {
					const r = asRecord(params.row);
					return (
						<button
							type="button"
							style={{ cursor: "pointer", border: "none", background: "transparent", padding: 0, fontWeight: 600, color: "#e2552d", textDecoration: "underline" }}
							onClick={(e) => {
								e.preventDefault();
								void openAffectation(r);
							}}
						>
							{asString(r.b_Numero)}
						</button>
					);
				},
			},
			{ field: "b_Titre", headerName: "Titre", width: 160 },
			{ field: "b_Demandeur", headerName: "Demandeur", width: 140 },
			{ field: "cA_Intitule", headerName: "Affaire", width: 140 },
			{ field: "dE_Intitule", headerName: "Dépôt", width: 120 },
			{
				field: "b_Etat_Affectation_Acheteur",
				headerName: "État",
				width: 160,
				renderCell: (params) => {
					const etat = asNumber(params.value);
					const ui = affectationStateUi[etat];
					if (!ui) return <span>{etat}</span>;
					return (
						<Box sx={{ minWidth: 120 }}>
							<Typography variant="caption" sx={{ fontWeight: 600 }}>{ui.label}</Typography>
							<Box sx={{ mt: 0.5, height: 4, overflow: "hidden", borderRadius: 0.5, bgcolor: "#e1e1e1" }}>
								<Box sx={{ height: "100%", transition: "width 0.5s", width: `${ui.width}%`, bgcolor: ui.color }} />
							</Box>
						</Box>
					);
				},
			},
			{
				field: "b_TypeDocument",
				headerName: "Type document",
				width: 130,
				renderCell: (params) => (asNumber(params.value) === TypeSage.BC_Achat ? "Bon de commande" : "Demande de prix"),
			},
			{
				field: "aD_TypeDemande",
				headerName: "Type demande",
				width: 140,
				renderCell: (params) =>
					asNumber(params.value) === Type_Validation.Retour_Demande_Validation ? "Retour demande" : "Demande besoin",
			},
		];

		const dynCols: GridColDef<DA_BESOIN_AACHETERDto>[] = champsLibreKeys.map((key) => ({
			field: `cl_${key}`,
			headerName: key,
			width: 120,
			renderCell: (params) => {
				const bag = asRecord(asRecord(params.row).ChampsLibres ?? asRecord(params.row).champsLibres);
				return asString(bag[key]);
			},
		}));

		base.push({
			field: "actions",
			headerName: " ",
			width: 60,
			sortable: false,
			filterable: false,
			renderCell: (params) => (
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
		});

		return [...base.slice(0, base.length - 1), ...dynCols, base[base.length - 1]];
	}, [champsLibreKeys]);

	return (
		<Box sx={{ mx: "auto", maxWidth: 1450, px: 2, py: 2 }}>
			<Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
				<Typography variant="h5" sx={{ mb: 0 }}>
					Gestion des demandes
				</Typography>
				<Stack direction="row" spacing={1}>
					<Button
						variant="outlined"
						size="small"
						disabled={!selectedId}
						onClick={() => {
							if (!selectedId) {
								toast.error("Aucune ligne sélectionnée");
								return;
							}
							void openAffectation(selected);
						}}
					>
						Détails
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

			<Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "flex-end", mb: 2 }}>
				<FormControl size="small" sx={{ minWidth: 90 }}>
					<InputLabel>Lignes</InputLabel>
					<Select
						value={filter.pageSize}
						label="Lignes"
						onChange={(e) => setFilter((p) => ({ ...p, pageSize: Number(e.target.value), pageIndex: 1 }))}
					>
						{[10, 20, 50, 100].map((v) => (
							<MenuItem key={v} value={v}>{v}</MenuItem>
						))}
					</Select>
				</FormControl>
				<Stack spacing={0.5}>
					<Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>Période</Typography>
					<Stack direction="row" spacing={1}>
						<TextField
							type="date"
							size="small"
							value={range[0].format("YYYY-MM-DD")}
							onChange={(e) => {
								const start = e.target.value ? dayjs(e.target.value) : null;
								if (!start) return;
								const end = range[1];
								setRange([start, end]);
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
								const start = range[0];
								setRange([start, end]);
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
						onChange={(e) => setFilter((p) => ({ ...p, B_Etat_Affectation_Acheteur: Number(e.target.value), pageIndex: 1 }))}
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
						onChange={(e) => setFilter((p) => ({ ...p, B_TypeDocument: Number(e.target.value), pageIndex: 1 }))}
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
						onChange={(e) => setFilter((p) => ({ ...p, AD_TypeDemande: Number(e.target.value), pageIndex: 1 }))}
					>
						<MenuItem value={Type_Validation.Demande_Besoin}>Demande besoin</MenuItem>
						<MenuItem value={Type_Validation.Retour_Demande_Validation}>Retour demande</MenuItem>
					</Select>
				</FormControl>
				<Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void loadData()} size="small">
					Actualiser
				</Button>
			</Stack>

			<Box sx={{ height: 500 }}>
				<DataGrid
					rows={rows}
					columns={columns}
					loading={loading}
					rowCount={total}
					paginationMode="server"
					onPaginationModelChange={({ page, pageSize }) => {
						setFilter((p) => ({ ...p, pageIndex: page + 1, pageSize }));
					}}
					getRowId={(row) => asNumber(asRecord(row).B_No ?? asRecord(row).b_No)}
					onRowClick={({ row }) => {
						const r = asRecord(row);
						const rowId = asNumber(r.B_No ?? r.b_No);
						setSelectedId(rowId);
						setSelected(r);
					}}
					onRowDoubleClick={({ row }) => void openAffectation(asRecord(row))}
					density="compact"
					slots={{
						noRowsOverlay: () => (
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
								<Typography color="text.secondary">Aucune donnée</Typography>
							</Box>
						),
					}}
				/>
			</Box>
		</Box>
	);
}
