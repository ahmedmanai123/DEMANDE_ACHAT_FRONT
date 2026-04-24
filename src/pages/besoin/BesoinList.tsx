import {
	Add as AddIcon,
	FileDownload as FileDownloadIcon,
	InfoOutlined as InfoIcon,
	Refresh as RefreshIcon,
	VisibilityOutlined as VisibilityIcon,
} from "@mui/icons-material";
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
import type { GridColDef, GridRowParams } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as besoinService from "@/services/besoinservice";
import { useBesoinStore } from "@/store/useBesoinStore";
import { Etat_Besoin, type IBesoin } from "@/types/besoin";
import { ETAT_BESOIN_LABELS, getEtatBesoinProgressBar } from "@/utils/besoin.utils";

dayjs.locale("fr");

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
	return direct != null && direct !== "" ? String(direct) : "";
};

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

	useEffect(() => {
		const start = filter.dateDebut ? dayjs(String(filter.dateDebut)) : dayjs().startOf("isoWeek");
		const end = filter.dateFin ? dayjs(String(filter.dateFin)) : dayjs().endOf("isoWeek");
		setRangeValue([start, end]);
	}, [filter.dateDebut, filter.dateFin]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: filter properties trigger refetch
	useEffect(() => {
		void fetchBesoins();
	}, [fetchBesoins, filter.pageIndex, filter.pageSize, filter.b_Numero, filter.b_Titre, filter.b_Demandeur, filter.b_Etat_Besoin, filter.B_Etat_Besoin, filter.dateDebut, filter.dateFin]);

	const showRecapPlaceholder = useCallback((row: IBesoin) => {
		const num = String(asRecord(row).b_Numero ?? asRecord(row).B_Numero ?? "");
		toast.info(`Récap de validation — ${num || "—"}\nÉquivalent de la popup ValidateurBesoin côté MVC : branchez l'API / circuit de validation pour afficher le détail ici.`);
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
				renderCell: (params) => {
					const num = String(asRecord(params.row).b_Numero ?? asRecord(params.row).B_Numero ?? "");
					return (
						<button
							type="button"
							style={{ cursor: "pointer", border: "none", background: "transparent", padding: 0, fontWeight: 600, color: "#e2552d", textDecoration: "underline" }}
							onClick={(e) => {
								e.stopPropagation();
								onEdit(getBesoinId(params.row));
							}}
						>
							{num || "—"}
						</button>
					);
				},
			},
			{ field: "b_Titre", headerName: "Titre", width: 160 },
			{
				field: "b_Date",
				headerName: "Date création",
				width: 120,
				renderCell: (params) => {
					const v = asRecord(params.row).b_Date ?? asRecord(params.row).B_Date;
					return v ? new Date(String(v)).toLocaleDateString("fr-FR") : "—";
				},
			},
			{ field: "b_Demandeur", headerName: "Demandeur", width: 120 },
			{ field: "cA_Intitule", headerName: "Affaire", width: 140 },
			{ field: "dE_Intitule", headerName: "Dépôt", width: 120 },
			{
				field: "b_Etat_Besoin",
				headerName: "État",
				width: 160,
				renderCell: (params) => {
					const etat = Number(params.value);
					const label = ETAT_BESOIN_LABELS[etat] ?? `État ${etat}`;
					const { widthPct, barColor } = getEtatBesoinProgressBar(etat);
					return (
						<Box sx={{ minWidth: 100 }}>
							<Typography variant="caption" sx={{ fontWeight: 600 }}>{label}</Typography>
							<Box sx={{ mt: 0.5, height: 4, overflow: "hidden", borderRadius: 0.5, bgcolor: "#e1e1e1" }}>
								<Box sx={{ height: "100%", transition: "width 0.5s", width: `${widthPct}%`, bgcolor: barColor }} />
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
			renderCell: (params) => readChampLibreCell(params.row, key),
		}));

		const actions: GridColDef<IBesoin>[] = [
			{
				field: "actions",
				headerName: " ",
				width: 88,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Stack direction="row" spacing={0.5}>
						<Button
							size="small"
							title="Consulter"
							onClick={(e) => {
								e.stopPropagation();
								onView(getBesoinId(params.row));
							}}
						>
							<VisibilityIcon fontSize="small" />
						</Button>
						<Button
							size="small"
							title="Récap de validation"
							onClick={(e) => {
								e.stopPropagation();
								showRecapPlaceholder(params.row);
							}}
						>
							<InfoIcon fontSize="small" />
						</Button>
					</Stack>
				),
			},
		];

		return [...base, ...dynamiques, ...actions];
	}, [champsLibreColumnKeys, onEdit, onView, showRecapPlaceholder]);

	const onRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
		if (!dates || !dates[0] || !dates[1]) return;
		setRangeValue([dates[0], dates[1]]);
		setFilter({
			dateDebut: dates[0].format("YYYY-MM-DD"),
			dateFin: dates[1].format("YYYY-MM-DD"),
		});
	};

	return (
		<Box sx={{ mx: "auto", maxWidth: 1400, px: 2, py: 2 }}>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, borderBottom: 1, borderColor: "divider", pb: 1.5, mb: 2 }}>
				<Typography variant="h5" sx={{ mb: 0 }}>
					Demandes de besoin
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Filtrez par période, état et colonnes dynamiques (champs libres) comme sur la vue MVC.
				</Typography>
			</Box>

			<Stack spacing={2} sx={{ flexDirection: { xs: "column", lg: "row" }, alignItems: { lg: "flex-end" }, justifyContent: "space-between" }}>
				<Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
					<FormControl size="small" sx={{ minWidth: 100 }}>
						<InputLabel>Lignes</InputLabel>
						<Select
							value={filter.pageSize ?? 20}
							label="Lignes"
							onChange={(e) => setFilter({ pageSize: Number(e.target.value) })}
						>
							{PAGE_SIZE_OPTIONS.map((n) => (
								<MenuItem key={n} value={n}>{n}</MenuItem>
							))}
						</Select>
					</FormControl>
					<Stack spacing={0.5}>
						<Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>Période</Typography>
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
								<MenuItem key={key} value={Number(key)}>{label}</MenuItem>
							))}
						</Select>
					</FormControl>
					<Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchBesoins()} size="small">
						Actualiser
					</Button>
				</Stack>

				<Stack direction="row" spacing={1}>
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => void handleNewClick()} size="small">
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
					<Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => void handleExportExcel()} size="small">
						Exporter
					</Button>
				</Stack>
			</Stack>

			<Box sx={{ mt: 2, height: 500 }}>
				<DataGrid
					rows={besoins}
					columns={columns}
					loading={loading}
					rowCount={totalCount}
					paginationMode="server"
					getRowId={(row) => getBesoinId(row)}
					onPaginationModelChange={({ page, pageSize }) => setFilter({ pageIndex: page + 1, pageSize })}
					onRowClick={(params: GridRowParams<IBesoin>) => {
						setSelectedId(getBesoinId(params.row));
					}}
					onRowDoubleClick={(params: GridRowParams<IBesoin>) => {
						onEdit(getBesoinId(params.row));
					}}
					sx={{
						"& .MuiDataGrid-row.Mui-selected": {
							bgcolor: "action.selected",
						},
					}}
					disableRowSelectionOnClick={false}
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
