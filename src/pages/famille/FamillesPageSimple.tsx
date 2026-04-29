import {
	Box,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useFamilleStore } from "@/store/useFamilleStore";
import type { FAMILLEDto } from "@/types/famille";

interface FamillesPageProps {
	onEdit?: (cbMarq: number) => void;
	onNew?: () => void;
}

const FamillesPage: React.FC<FamillesPageProps> = ({
	onEdit,
	onNew,
}) => {
	const navigate = useNavigate();
	const {
		familles,
		loading,
		pagination,
		fetchFamilles,
		setPagination,
	} = useFamilleStore();

	const [rowSelectionModel, setRowSelectionModel] = useState<number[]>([]);

	// Permissions (simulated - replace with actual auth logic)
	const permissions = {
		creer: true,
		modifier: true,
		consulter: true,
		supprimer: true,
	};

	useEffect(() => {
		fetchFamilles();
	}, [fetchFamilles]);

	const handleRowDoubleClick = (record: any) => {
		if (!permissions.consulter) return;

		const recordId = record.cbMarq || record.cBMarq;
		if (onEdit) {
			onEdit(recordId);
		} else {
			navigate(`/famille/addorupdate?cbMarq=${recordId}`);
		}
	};

	const columns: GridColDef[] = [
		{
			field: "fA_CodeFamille",
			headerName: "Code famille",
			width: 120,
			renderCell: (params) => {
				if (!permissions.consulter) {
					return params.value;
				}

				const recordId = (params.row as any).cbMarq || (params.row as any).cBMarq;
				return (
					<Box
						component="button"
						sx={{ 
							color: "#e2552d", 
							textDecoration: "underline", 
							bg: "transparent",
							border: "none",
							cursor: "pointer",
							font: "inherit"
						}}
						onClick={() => {
							if (onEdit) {
								onEdit(recordId);
							} else {
								navigate(`/famille/addorupdate?cbMarq=${recordId}`);
							}
						}}
					>
						{params.value}
					</Box>
				);
			},
		},
		{
			field: "fA_Intitule",
			headerName: "Intitulé",
			width: 200,
			flex: 1,
			renderCell: (params) => params.value || "",
		},
		{
			field: "fA_Type",
			headerName: "Type",
			width: 80,
			renderCell: (params) => {
				const value = params.value as number;
				let label: string;
				switch (value) {
					case 0:
						label = "Détail";
						break;
					case 1:
						label = "Total";
						break;
					case 2:
						label = "Centralisateur";
						break;
					default:
						label = "";
				}
				return label;
			},
		},
	];

	return (
		<Box sx={{ width: "100%", p: 2 }}>
			{/* Breadcrumb */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
				<Typography variant="body2">
					Accueil / Familles
				</Typography>
			</Box>

			{/* Page Size Selector */}
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
				<Box sx={{ minWidth: 120 }}>
					<select
						value={pagination.pageSize}
						onChange={(e) => setPagination({ pageSize: Number(e.target.value) })}
						style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
					>
						<option value={5}>5 lignes</option>
						<option value={10}>10 lignes</option>
						<option value={25}>25 lignes</option>
						<option value={50}>50 lignes</option>
						<option value={100}>100 lignes</option>
					</select>
				</Box>
			</Box>

			{/* Data Grid */}
			<Box sx={{ height: 600, width: "100%" }}>
				<DataGrid
					rows={familles}
					columns={columns}
					getRowId={(row) => (row as any).cbMarq || (row as any).cBMarq || Math.random()}
					loading={loading}
					paginationMode="server"
					paginationModel={{
						page: pagination.current - 1,
						pageSize: pagination.pageSize,
					}}
					rowCount={pagination.total}
					pageSizeOptions={[5, 10, 20, 50]}
					onPaginationModelChange={(model) => {
						setPagination({
							current: model.page + 1,
							pageSize: model.pageSize,
						});
					}}
					onRowDoubleClick={(params) => handleRowDoubleClick(params.row)}
					checkboxSelection
					onRowSelectionModelChange={(newSelection) => {
						setRowSelectionModel(newSelection as unknown as number[]);
					}}
					sx={{
						"& .MuiDataGrid-row:hover": {
							backgroundColor: "#f5f5f5",
						},
						"& .MuiDataGrid-row.Mui-selected": {
							backgroundColor: "#c4e2ff !important",
						},
					}}
				/>
			</Box>
		</Box>
	);
};

export default FamillesPage;
