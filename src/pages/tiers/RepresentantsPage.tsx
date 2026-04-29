import { Box, FormControl, MenuItem, Select, Stack, TablePagination, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { getCollaborateurs } from "@/api/tiersApi";
import type { CollaborateurDto, CollaborateurFilter } from "@/types/collaborateur";

// ================================================================
// STYLES
// ================================================================
const STYLES = `
  .representants-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    background: #f4f6f9;
    padding: 12px;
    box-sizing: border-box;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6c757d;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .breadcrumb li {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .breadcrumb a {
    color: #6c757d;
    text-decoration: none;
    transition: color 0.2s;
  }

  .breadcrumb a:hover {
    color: #495057;
  }

  .breadcrumb li.active a {
    color: #212529;
    font-weight: 600;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid #e1e4e8;
  }

  .main-card {
    flex: 1;
    min-height: 0;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    border: 1px solid #e1e4e8;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Style pour les lignes sélectionnées - similaire à l'original */
  .MuiDataGrid-row.Mui-selected {
    background-color: #c4e2ff !important;
    border-color: #c4e2ff !important;
  }

  .MuiDataGrid-row.Mui-selected:hover {
    background-color: #b3d9ff !important;
  }
`;

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
interface Props {
	CT_Num?: string; // Paramètre du tiers pour filtrer les collaborateurs
}

export default function RepresentantsPage({ CT_Num }: Props) {
	const [collaborateurs, setCollaborateurs] = useState<CollaborateurDto[]>([]);
	const [loading, setLoading] = useState(false);
	const [pagination, setPagination] = useState({
		current: 1,
		pageSize: 10,
		total: 0,
	});
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [filters] = useState<CollaborateurFilter>({});

	// Charger les collaborateurs
	const fetchCollaborateurs = async () => {
		setLoading(true);
		try {
			const filterParams: CollaborateurFilter = {
				...filters,
				CT_Num,
				pageIndex: pagination.current,
				pageSize: pagination.pageSize,
			};

			const response = await getCollaborateurs(filterParams);
			console.log("Données reçues:", response);
			console.log("Collaborateurs:", response.data);
			setCollaborateurs(response.data);
			setPagination((prev) => ({
				...prev,
				total: response.total || response.itemsCount || 0,
			}));
		} catch (error) {
			console.error("Error fetching collaborateurs:", error);
		} finally {
			setLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchCollaborateurs called on mount and when dependencies change
	useEffect(() => {
		fetchCollaborateurs();
	}, [CT_Num, pagination.current, pagination.pageSize]);

	// Colonnes du DataGrid
	const columns: GridColDef[] = [
		{
			field: "cO_Nom",
			headerName: "Nom",
			width: 120,
			filterable: true,
		},
		{
			field: "cO_Prenom",
			headerName: "Prénom",
			width: 120,
			filterable: true,
		},
		{
			field: "cO_Fonction",
			headerName: "Fonction",
			width: 150,
			filterable: true,
		},
		{
			field: "cO_Service",
			headerName: "Service",
			width: 150,
			filterable: true,
		},
		{
			field: "cO_Adresse",
			headerName: "Adresse",
			width: 200,
			filterable: true,
		},
		{
			field: "cO_CodePostal",
			headerName: "Code postal",
			width: 100,
			filterable: true,
		},
		{
			field: "cO_Ville",
			headerName: "Ville",
			width: 120,
			filterable: true,
		},
		{
			field: "cO_Telephone",
			headerName: "Téléphone",
			width: 130,
			filterable: true,
		},
	];

	const handlePageSizeChange = (newPageSize: number) => {
		setPagination((prev) => ({
			...prev,
			pageSize: newPageSize,
			current: 1, // Reset to first page when changing page size
		}));
	};

	return (
		<>
			<style>{STYLES}</style>

			<div >
				{/* Breadcrumb */}
				<ol className="breadcrumb">
					<li>
						<a href="/">
							<i className="mdi mdi-home"></i>
							Accueil
						</a>
					</li>
					<li className="active">
						<a href="/tiers/representants" style={{ fontWeight: 600 }}>
							Représentants
						</a>
					</li>
				</ol>

				<hr style={{ borderBottom: "1px solid #ffffff", marginBottom: "0.3em", marginTop: "0.1em" }} />

			
				{/* DataGrid principal */}
				<div className="main-card">
					<TablePagination
						component="div"
						count={pagination.total}
						page={pagination.current - 1}
						onPageChange={(_, newPage) => {
							setPagination((prev) => ({
								...prev,
								current: newPage + 1,
							}));
						}}
						rowsPerPage={pagination.pageSize}
						onRowsPerPageChange={(e) => {
							setPagination((prev) => ({
								...prev,
								pageSize: Number(e.target.value),
								current: 1,
							}));
						}}
						rowsPerPageOptions={[5, 10, 20, 50, 100]}
						labelRowsPerPage="Lignes par page"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						sx={{ borderBottom: "1px solid #e2e8f0" }}
					/>

					<Box sx={{ flex: 1, minHeight: 0 }}>
						<DataGrid
							rows={collaborateurs}
							columns={columns}
							loading={loading}
							getRowId={(row) => {
								console.log("Row:", row);
								return row.cO_No;
							}}
							onRowClick={({ row }) => setSelectedId(row.cO_No)}
							onRowSelectionModelChange={(newSelection) => {
								// Gérer différents types possibles de GridRowSelectionModel
								let selectedId: number | null = null;

								if (Array.isArray(newSelection)) {
									selectedId = newSelection.length > 0 ? (newSelection[0] as number) : null;
								} else if (newSelection instanceof Set) {
									const firstItem = newSelection.values().next().value;
									selectedId = firstItem ? (firstItem as number) : null;
								} else if (newSelection && typeof newSelection === "object") {
									// Cas pour l'objet avec propriété 'ids'
									const selectionObj = newSelection as any;
									if (Array.isArray(selectionObj.ids)) {
										selectedId = selectionObj.ids.length > 0 ? (selectionObj.ids[0] as number) : null;
									}
								}

								setSelectedId(selectedId);
								// Simuler le comportement de l'input caché original
								const hiddenInput = document.getElementById("cbMarq") as HTMLInputElement;
								if (hiddenInput) {
									hiddenInput.value = (selectedId || 0).toString();
								}
							}}
							hideFooter
							density="compact"
							sx={{
								"& .MuiDataGrid-row.Mui-selected": {
									bgcolor: "#c4e2ff !important",
									"&:hover": {
										bgcolor: "#b3d9ff !important",
									},
								},
							}}
						/>
					</Box>
				</div>

				{/* Input caché pour compatibilité avec l'original */}
				<input id="cbMarq" type="hidden" value={selectedId || 0} onChange={() => {}} />
			</div>
		</>
	);
}
