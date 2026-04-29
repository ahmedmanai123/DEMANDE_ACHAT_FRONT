import {
	Box,
	Chip,
	FormControl,
	MenuItem,
	Select,
	TablePagination,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useFamilleStore } from "@/store/useFamilleStore";
import type { FAMILLEDto } from "@/types/famille";

const STYLES = `
  .fam-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    background: #f4f6f9;
    padding: 12px;
    box-sizing: border-box;
  }

  .fam-main {
    display: flex;
    flex: 1;
    min-height: 0;
    gap: 12px;
  }

  .fam-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .fam-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .fam-toolbar {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .fam-page-size-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fam-page-size-label {
    font-size: 12px;
    color: #6b7280;
    white-space: nowrap;
  }

  .fam-table-wrap {
    flex: 1;
    overflow: auto;
    background: white;
  }

  .fam-ref {
    color: #e2552d;
    text-decoration: underline;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
  }

  .fam-ref:hover {
    color: #d9440f;
  }
`;

interface Props {
	onEdit: (cbMarq: number) => void;
}

export default function FamillesPage({ onEdit }: Props) {
	const { familles, loading, pagination, filters, fetchFamilles, setPagination, setFilters } = useFamilleStore();

	const [codeFilter, setCodeFilter] = useState("");
	const [intituleFilter, setIntituleFilter] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchFamilles();
	}, [fetchFamilles, pagination.current, pagination.pageSize, filters]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setFilters({
				FA_CodeFamille: codeFilter.trim() || undefined,
				FA_Intitule: intituleFilter.trim() || undefined,
			});
		}, 250);

		return () => window.clearTimeout(timeout);
	}, [codeFilter, intituleFilter, setFilters]);

	const renderTypeChip = (value: number) => {
		const labels: Record<number, string> = { 0: "Detail", 1: "Total", 2: "Centralisateur" };
		const label = labels[value] ?? "";

		return (
			<Chip
				label={label}
				size="small"
				sx={{
					fontSize: 11,
					fontWeight: 600,
					borderRadius: 1,
					bgcolor: value === 0 ? "#48bb78" : value === 1 ? "#4299e1" : "#ed8936",
					color: "#fff",
				}}
			/>
		);
	};

	// Colonnes du DataGrid pour les familles
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const columns: GridColDef[] = useMemo(
		() => [
			{
				field: "fA_Type",
				headerName: "Type",
				width: 120,
				renderCell: (params) => renderTypeChip(params.value),
			},
			{
				field: "fA_CodeFamille",
				headerName: "Code famille",
				width: 170,
				renderCell: (params) => (
					// biome-ignore lint/a11y/useValidAnchor: <explanation>
					<a
						href="#"
						className="fam-ref"
						onClick={(e) => {
							e.preventDefault();
							onEdit(params.row.cbMarq);
						}}
					>
						{params.value}
					</a>
				),
			},
			{
				field: "fA_Intitule",
				headerName: "Intitule",
				minWidth: 240,
				flex: 1,
			},
			{
				field: "fA_Central",
				headerName: "Centralisation",
				width: 190,
				renderCell: (params) => (params.value === 1 ? "Oui" : "Non"),
			},
			{
				field: "cL_Intitule1",
				headerName: "Catalogue article",
				width: 190,
				renderCell: (params) => params.value || "",
			},
		],
		[onEdit],
	);

	const rows = familles as FAMILLEDto[];

	return (
		<>
			<style>{STYLES}</style>

			<div className="fam-page">
				<div className="fam-main">
					<div className="fam-right">
						<div className="fam-card">
							<div className="fam-toolbar">
								<div className="fam-page-size-wrap">
									<span className="fam-page-size-label">Lignes :</span>
									<FormControl size="small" sx={{ width: 70, minWidth: 70 }}>
										<Select
											value={pagination.pageSize}
											onChange={(e) => setPagination({ pageSize: Number(e.target.value), current: 1 })}
										>
											{[5, 10, 20, 50, 100].map((count) => (
												<MenuItem key={count} value={count}>
													{count}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</div>

								<TablePagination
									component="div"
									count={pagination.total}
									page={pagination.current - 1}
									onPageChange={(_, newPage) => setPagination({ current: newPage + 1 })}
									rowsPerPage={pagination.pageSize}
									onRowsPerPageChange={(e) =>
										setPagination({
											pageSize: Number(e.target.value),
											current: 1,
										})
									}
									rowsPerPageOptions={[5, 10, 20, 50, 100]}
									labelRowsPerPage="Lignes par page"
									labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
									sx={{ border: "none" }}
								/>
							</div>

							<Box className="fam-table-wrap">
								<DataGrid
									rows={rows}
									columns={columns}
									loading={loading}
									hideFooter={true}
									getRowId={(row) => row.cbMarq}
									sx={{
										"& .MuiDataGrid-root": {
											border: "none",
										},
										"& .MuiDataGrid-columnHeaders": {
											backgroundColor: "#f8fafc",
											borderBottom: "1px solid #e2e8f0",
										},
										"& .MuiDataGrid-cell": {
											borderBottom: "1px solid #f1f5f9",
										},
									}}
								/>
							</Box>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
