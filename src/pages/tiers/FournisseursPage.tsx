import { Home as HomeIcon, PersonOff as PersonOffIcon, PowerSettingsNew as PowerIcon } from "@mui/icons-material";
import {
	Alert,
	Box,
	Breadcrumbs,
	Chip,
	Link,
	Snackbar,
	TablePagination,
	Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTiersStore } from "@/store/useTiersStore";
import type { F_COMPTETDto } from "@/types/tiers";

interface FournisseursPageProps {
	etatView?: boolean;
	idInput?: string;
	champForSelect?: string;
	idInput2?: string;
	champForSelect2?: string;
	onEdit?: (cbMarq: number) => void;
	onNew?: () => void;
}

const FournisseursPage: React.FC<FournisseursPageProps> = ({
	etatView = false,
	idInput,
	champForSelect,
	idInput2,
	champForSelect2,
	onEdit,
}) => {
	const navigate = useNavigate();
	const { tiers, loading, pagination, fetchTiers, setSelectedTier, setPagination } = useTiersStore();

	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error" | "warning" | "info";
	}>({ open: false, message: "", severity: "info" });

	// Permissions (simulated - replace with actual auth logic)
	const permissions = {
		creer: true,
		modifier: true,
		consulter: true,
		supprimer: true,
	};

	useEffect(() => {
		fetchTiers();
	}, [fetchTiers, pagination.current, pagination.pageSize]);

	const handleRowClick = (record: any) => {
		setSelectedTier(record);

		// Handle modal selection if in etatView mode
		if (etatView && idInput && champForSelect) {
			const inputElement = document.getElementById(idInput) as HTMLInputElement;
			if (inputElement && record) {
				inputElement.value = record[champForSelect] || "";
			}

			if (idInput2 && champForSelect2) {
				const inputElement2 = document.getElementById(idInput2) as HTMLInputElement;
				if (inputElement2 && record) {
					inputElement2.value = record[champForSelect2] || "";
				}
			}

			// Close modal (you'll need to implement this based on your modal system)
			const modal = document.getElementById("form-modalPopup");
			if (modal) {
				(modal as any).modal?.("hide");
			}
		}
	};

	const handleRowDoubleClick = (record: F_COMPTETDto) => {
		if (!permissions.consulter) return;

		if (onEdit) {
			onEdit(record.cbMarq);
		} else {
			navigate(`/tiers/addorupdate?cbMarq=${record.cbMarq}&CT_Type=1`);
		}
	};

	const columns: GridColDef[] = [
		{
			field: "cT_Sommeil",
			headerName: "Sommeil",
			width: 120,
			renderCell: (params) => {
				const value = params.value as number;
				return (
					<Chip
						icon={value === 0 ? <PowerIcon /> : <PersonOffIcon />}
						label={value === 0 ? "Actifs" : "En sommeil"}
						color={value === 0 ? "success" : "error"}
						size="small"
					/>
				);
			},
		},
		{
			field: "cT_Num",
			headerName: "Numéro",
			width: 120,
			renderCell: (params) => {
				if (!permissions.consulter) {
					return params.value;
				}

				const recordId = (params.row as any).cbMarq || (params.row as any).cBMarq;
				return (
					<Link
						component="button"
						variant="body2"
						onClick={() => {
							if (onEdit) {
								onEdit(recordId);
							} else {
								navigate(`/tiers/addorupdate?cbMarq=${recordId}&CT_Type=1`);
							}
						}}
						sx={{ color: "#e2552d", textDecoration: "underline" }}
					>
						{params.value}
					</Link>
				);
			},
		},
		{
			field: "cT_Intitule",
			headerName: "Intitulé du compte",
			width: 200,
			flex: 1,
			renderCell: (params) => params.value || "",
		},
		{
			field: "cT_Classement",
			headerName: "Abrégé",
			width: 150,
			renderCell: (params) => params.value || "",
		},
		{
			field: "cT_Contact",
			headerName: "Contact",
			width: 150,
			renderCell: (params) => params.value || "",
		},
		{
			field: "cT_Adresse",
			headerName: "Adresse",
			width: 200,
			flex: 1,
			renderCell: (params) => params.value || "",
		},
		{
			field: "cT_Email",
			headerName: "E-mail",
			width: 200,
			renderCell: (params) => params.value || "",
		},
		{
			field: "cT_Identifiant",
			headerName: "N° identifiant",
			width: 150,
			renderCell: (params) => params.value || "",
		},
	];

	const handleCloseSnackbar = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	return (
		<Box sx={{ width: "100%", p: 2 }}>
			{!etatView && (
				<>
					<Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
						<Link
							component="button"
							variant="body1"
							onClick={() => navigate("/")}
							sx={{ display: "flex", alignItems: "center" }}
						>
							<HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
							Accueil
						</Link>
						<Typography color="text.primary" sx={{ fontWeight: 600 }}>
							Fournisseurs
						</Typography>
					</Breadcrumbs>
					<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }} />
				</>
			)}

			<Box sx={{ height: 600, width: "100%" }}>
				<TablePagination
					component="div"
					count={pagination.total}
					page={pagination.current - 1}
					onPageChange={(_, newPage) => {
						setPagination({ current: newPage + 1 });
					}}
					rowsPerPage={pagination.pageSize}
					onRowsPerPageChange={(e) => {
						setPagination({
							pageSize: Number(e.target.value),
							current: 1,
						});
					}}
					rowsPerPageOptions={[5, 10, 20, 50, 100]}
					labelRowsPerPage="Lignes par page"
					labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					sx={{ borderBottom: "1px solid #e2e8f0", mb: 1 }}
				/>

				<DataGrid
					rows={tiers}
					columns={columns}
					getRowId={(row) => (row as any).cbMarq || (row as any).cBMarq || Math.random()}
					loading={loading}
					hideFooter
					onRowClick={(params) => handleRowClick(params.row)}
					onRowDoubleClick={(params) => handleRowDoubleClick(params.row)}
					checkboxSelection
					sx={{
						"& .MuiDataGrid-row:hover": {
							backgroundColor: "#f5f5f5",
						},
						"& .MuiDataGrid-row.Mui-selected": {
							backgroundColor: "#c4e2ff !important",
						},
						"& .MuiDataGrid-cell:focus": {
							outline: "none",
						},
						"& .MuiDataGrid-columnHeader:focus": {
							outline: "none",
						},
					}}
				/>
			</Box>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={handleCloseSnackbar}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default FournisseursPage;
