import {
	Add as AddIcon,
	Check as CheckIcon,
	Close as CloseIcon,
	ContentCopy as CopyIcon,
	MoreVert as MoreVertIcon,
	OpenInNew as OpenInNewIcon,
	Print as PrintIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Chip,
	FormControl,
	IconButton,
	InputLabel,
	LinearProgress,
	Menu,
	MenuItem,
	Select,
	Stack,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
	annulerDocumentSage,
	comptabiliserDocument,
	getDocuments,
	validerDocumentSage,
} from "@/services/documentService";
import { Type_Validation_Document, TypeSage } from "@/types/besoin";

// Helpers
const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => (typeof value === "string" ? value : String(value ?? ""));
const asNumber = (value: unknown): number => {
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const n = Number(value);
		return Number.isNaN(n) ? 0 : n;
	}
	return 0;
};
const asBool = (value: unknown): boolean => value === true || value === "true" || value === 1;

interface DocumentItem {
	eP_Numero: string;
	eP_Date: string;
	tP_No: number;
	eP_Tiers: string;
	cT_Intitule: string;
	eP_Reference: string;
	eP_DateLivraison: string;
	eP_NumeroSage: string;
	eP_ValiderAERP: number;
	eP_Comptabiliser: number;
	eP_TotalHT: number;
	eP_TotalTTC: number;
	lP_No: number;
}

interface FilterState {
	pageSize: number;
	pageIndex: number;
	dateDebut: string;
	dateFin: string;
	eP_Numero: string;
	eP_Tiers: string;
	eP_ValiderAERP: number;
	tP_No: number;
}

interface DocumentListPageProps {
	tpNo?: number;
}

export default function DocumentListPage({ tpNo: propTpNo }: DocumentListPageProps) {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const tpNo = propTpNo ?? Number(searchParams.get("tpNo")) ?? TypeSage.Demande_Achat;

	const isDemandePrix = tpNo === TypeSage.Demande_Achat;
	const title = isDemandePrix ? "Demandes des prix" : "Bons de commande";

	// Data state
	const [documents, setDocuments] = useState<DocumentItem[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);

	// Selection state
	const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

	// Menu state
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	// Filter state
	const [filter, setFilter] = useState<FilterState>({
		pageSize: 10,
		pageIndex: 1,
		dateDebut: dayjs().startOf("week").format("YYYY-MM-DD"),
		dateFin: dayjs().endOf("week").format("YYYY-MM-DD"),
		eP_Numero: "",
		eP_Tiers: "",
		eP_ValiderAERP: -1,
		tP_No: tpNo,
	});

	// Permissions (would come from auth context)
	const permissions = useMemo(
		() => ({
			ajouter: true,
			consulter: true,
			validerSage: true,
			comptabiliser: true,
			imprimer: true,
		}),
		[],
	);

	// Load documents
	const loadDocuments = useCallback(async () => {
		setLoading(true);
		try {
			const res = await getDocuments({
				...filter,
				tP_No: tpNo,
			});
			const resRecord = asRecord(res);
			setDocuments(Array.isArray(resRecord.data) ? (resRecord.data as DocumentItem[]) : []);
			setTotal(asNumber(resRecord.itemsCount ?? resRecord.totalCount));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur de chargement");
		} finally {
			setLoading(false);
		}
	}, [filter, tpNo]);

	useEffect(() => {
		void loadDocuments();
	}, [loadDocuments]);

	// Actions
	const onNew = () => {
		navigate(`/document/details?epNumero=&tpNo=${tpNo}`);
	};

	const onDetails = () => {
		if (!selectedDoc) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		navigate(`/document/details?epNumero=${selectedDoc.eP_Numero}&tpNo=${selectedDoc.tP_No}`);
	};

	const onOpenInNewTab = () => {
		if (!selectedDoc) return;
		window.open(`/document/details?epNumero=${selectedDoc.eP_Numero}&tpNo=${selectedDoc.tP_No}`, "_blank");
	};

	const onValiderSage = async () => {
		if (!selectedDoc) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		if (!window.confirm("Êtes-vous sûr de vouloir valider ce document ?")) return;
		try {
			const res = await validerDocumentSage(selectedDoc.eP_Numero, selectedDoc.tP_No);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
				toast.success("Document validé dans Sage");
				void loadDocuments();
			} else {
				toast.error(asString(resRecord.Message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	const onAnnuler = async () => {
		if (!selectedDoc) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		if (!window.confirm("Êtes-vous sûr de vouloir annuler ce document ?")) return;
		try {
			const res = await annulerDocumentSage(selectedDoc.eP_Numero, selectedDoc.tP_No);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
				toast.success("Document annulé");
				void loadDocuments();
			} else {
				toast.error(asString(resRecord.Message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	const onComptabiliser = async () => {
		if (!selectedDoc) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		if (!window.confirm("Êtes-vous sûr de vouloir comptabiliser ce document ?")) return;
		try {
			const res = await comptabiliserDocument(selectedDoc.eP_Numero, selectedDoc.tP_No);
			const resRecord = asRecord(res);
			if (asBool(resRecord.isValid)) {
				toast.success("Document comptabilisé");
				void loadDocuments();
			} else {
				toast.error(asString(resRecord.Message));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur");
		}
	};

	const onDupliquer = () => {
		if (!selectedDoc) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		// Navigate to duplicate page or open modal
		toast.info("Fonctionnalité à implémenter");
	};

	const onPrint = () => {
		if (!selectedDoc) {
			toast.error("Aucune ligne sélectionnée");
			return;
		}
		window.open(`/rapport?eP_Numero=${selectedDoc.eP_Numero}&tP_NO=${selectedDoc.tP_No}&reportType=Document`);
	};

	// Columns
	const columns: GridColDef<DocumentItem>[] = useMemo(
		() => [
			{
				field: "eP_Numero",
				headerName: "Numéro",
				width: 120,
				renderCell: ({ row }) => (
					<Button
						variant="text"
						size="small"
						sx={{ color: "#e2552d", textDecoration: "underline" }}
						onClick={(e) => {
							e.stopPropagation();
							navigate(`/document/details?epNumero=${row.eP_Numero}&tpNo=${row.tP_No}`);
						}}
					>
						{row.eP_Numero}
					</Button>
				),
			},
			{
				field: "eP_Date",
				headerName: "Date",
				width: 100,
				valueFormatter: (value) => {
					return value ? dayjs(value as string).format("DD/MM/YYYY") : "";
				},
			},
			{ field: "eP_Tiers", headerName: "Code fournisseur", width: 130 },
			{ field: "cT_Intitule", headerName: "Intitulé", width: 150, flex: 1 },
			{ field: "eP_Reference", headerName: "Référence", width: 130 },
			{
				field: "eP_DateLivraison",
				headerName: "Date livraison",
				width: 120,
				valueFormatter: (value) => {
					return value ? dayjs(value as string).format("DD/MM/YYYY") : "";
				},
			},
			{ field: "eP_NumeroSage", headerName: "N° Sage", width: 100 },
			{
				field: "eP_ValiderAERP",
				headerName: "État",
				width: 140,
				renderCell: ({ row }) => {
					const etat = row.eP_ValiderAERP;
					let label = "En cours";
					let color: "warning" | "success" | "error" | "info" = "warning";
					let progress = 10;

					if (etat === Type_Validation_Document.Cloturer) {
						label = "Clôturée";
						color = "success";
						progress = 55;
					} else if (etat === Type_Validation_Document.Valider_Sage) {
						label = "Validée";
						color = "success";
						progress = 95;
					} else if (etat === Type_Validation_Document.Annuler) {
						label = "Annulée";
						color = "error";
						progress = 100;
					}

					return (
						<Box sx={{ width: "100%" }}>
							<Typography variant="caption" sx={{ fontWeight: "bold" }}>
								{label}
							</Typography>
							<LinearProgress
								variant="determinate"
								value={progress}
								sx={{
									height: 5,
									bgcolor: "#e1e1e1",
									"& .MuiLinearProgress-bar": {
										bgcolor: color === "error" ? "red" : color === "success" ? "green" : "orange",
									},
								}}
							/>
						</Box>
					);
				},
			},
			{
				field: "eP_Comptabiliser",
				headerName: "Comptabilisé",
				width: 100,
				align: "center",
				renderCell: ({ row }) => (row.eP_Comptabiliser ? <Chip size="small" color="success" label="Oui" /> : null),
			},
			{
				field: "eP_TotalHT",
				headerName: "Montant HT",
				width: 110,
				align: "right",
				valueFormatter: (value) => {
					return value ? (value as number).toFixed(2) : "";
				},
			},
			{
				field: "eP_TotalTTC",
				headerName: "Montant TTC",
				width: 110,
				align: "right",
				valueFormatter: (value) => {
					return value ? (value as number).toFixed(2) : "";
				},
			},
			{
				field: "actions",
				headerName: "",
				width: 50,
				sortable: false,
				filterable: false,
				renderCell: ({ row }) => (
					<IconButton
						size="small"
						onClick={(e) => {
							e.stopPropagation();
							window.open(`/document/details?epNumero=${row.eP_Numero}&tpNo=${row.tP_No}`, "_blank");
						}}
						title="Ouvrir dans un nouvel onglet"
					>
						<OpenInNewIcon fontSize="small" />
					</IconButton>
				),
			},
		],
		[navigate],
	);

	const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	return (
		<Box sx={{ maxWidth: 1600, mx: "auto", p: 2 }}>
			{/* Breadcrumb */}
			<Box sx={{ mb: 2 }}>
				<Typography variant="body2" color="text.secondary">
					<a href="/" style={{ textDecoration: "none", color: "inherit" }}>
						Accueil
					</a>
					{" / "}
					<strong>{title}</strong>
				</Typography>
			</Box>

			{/* Filters */}
			<Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
				<FormControl size="small" sx={{ minWidth: 80 }}>
					<Select
						value={filter.pageSize}
						onChange={(e) => setFilter((p) => ({ ...p, pageSize: Number(e.target.value) }))}
					>
						<MenuItem value={5}>5</MenuItem>
						<MenuItem value={10}>10</MenuItem>
						<MenuItem value={50}>50</MenuItem>
						<MenuItem value={100}>100</MenuItem>
					</Select>
				</FormControl>

				<Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
					<Typography variant="body2">Période:</Typography>
					<input
						type="date"
						value={filter.dateDebut}
						onChange={(e) => setFilter((p) => ({ ...p, dateDebut: e.target.value }))}
						style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
					/>
					<span>-</span>
					<input
						type="date"
						value={filter.dateFin}
						onChange={(e) => setFilter((p) => ({ ...p, dateFin: e.target.value }))}
						style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
					/>
				</Box>

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>État</InputLabel>
					<Select
						value={filter.eP_ValiderAERP}
						onChange={(e) => setFilter((p) => ({ ...p, eP_ValiderAERP: Number(e.target.value) }))}
						label="État"
					>
						<MenuItem value={-1}>Tous</MenuItem>
						<MenuItem value={Type_Validation_Document.Encours}>En cours</MenuItem>
						<MenuItem value={Type_Validation_Document.Cloturer}>Clôturée</MenuItem>
						<MenuItem value={Type_Validation_Document.Valider_Sage}>Validée</MenuItem>
					</Select>
				</FormControl>
			</Stack>

			{/* Action Buttons */}
			<Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
				{permissions.ajouter && (
					<Button variant="contained" color="success" size="small" startIcon={<AddIcon />} onClick={onNew}>
						Nouveau
					</Button>
				)}
				{permissions.consulter && (
					<Button
						variant="contained"
						size="small"
						startIcon={<SearchIcon />}
						onClick={onDetails}
						disabled={!selectedDoc}
					>
						Détails
					</Button>
				)}
				{permissions.validerSage && (
					<Button
						variant="contained"
						color="success"
						size="small"
						startIcon={<CheckIcon />}
						onClick={() => void onValiderSage()}
						disabled={!selectedDoc || selectedDoc?.eP_ValiderAERP !== Type_Validation_Document.Cloturer}
					>
						Valider sage
					</Button>
				)}
				{permissions.comptabiliser && !isDemandePrix && (
					<Button
						variant="contained"
						color="success"
						size="small"
						startIcon={<CheckIcon />}
						onClick={() => void onComptabiliser()}
						disabled={
							!selectedDoc ||
							selectedDoc?.eP_ValiderAERP !== Type_Validation_Document.Valider_Sage ||
							selectedDoc?.eP_Comptabiliser === 1
						}
					>
						Comptabiliser
					</Button>
				)}

				<Button
					variant="outlined"
					size="small"
					startIcon={<MoreVertIcon />}
					onClick={handleMenuOpen}
					disabled={!selectedDoc}
				>
					Fonctions
				</Button>
				<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
					<MenuItem
						onClick={() => {
							handleMenuClose();
							onDupliquer();
						}}
					>
						<CopyIcon fontSize="small" sx={{ mr: 1 }} />
						Dupliquer
					</MenuItem>
				</Menu>

				{!isDemandePrix && (
					<Button
						variant="contained"
						color="error"
						size="small"
						startIcon={<CloseIcon />}
						onClick={() => void onAnnuler()}
						disabled={
							!selectedDoc ||
							(selectedDoc?.eP_ValiderAERP !== Type_Validation_Document.Encours &&
								selectedDoc?.eP_ValiderAERP !== Type_Validation_Document.Cloturer)
						}
					>
						Annuler
					</Button>
				)}

				{permissions.imprimer && (
					<Button
						variant="contained"
						color="inherit"
						size="small"
						startIcon={<PrintIcon />}
						onClick={onPrint}
						disabled={!selectedDoc}
					>
						Imprimer
					</Button>
				)}
			</Stack>

			{/* Data Grid */}
			<DataGrid
				rows={documents}
				columns={columns}
				loading={loading}
				pagination
				pageSizeOptions={[5, 10, 50, 100]}
				getRowId={(row) => row.eP_Numero}
				initialState={{
					pagination: {
						paginationModel: { pageSize: filter.pageSize, page: filter.pageIndex - 1 },
					},
				}}
				rowCount={total}
				paginationMode="server"
				onPaginationModelChange={(model) => {
					setFilter((p) => ({
						...p,
						pageIndex: model.page + 1,
						pageSize: model.pageSize,
					}));
				}}
				onRowClick={({ row }) => setSelectedDoc(row as DocumentItem)}
				rowSelectionModel={
					selectedDoc ? { type: "include", ids: new Set([selectedDoc.eP_Numero]) } : { type: "include", ids: new Set() }
				}
				sx={{
					"& .MuiDataGrid-row.Mui-selected": {
						bgcolor: "action.selected",
					},
				}}
			/>
		</Box>
	);
}
