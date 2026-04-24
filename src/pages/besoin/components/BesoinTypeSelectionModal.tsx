import { useCallback, useEffect, useState } from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
} from "@mui/material";
import {
	DataGrid,
	type GridColDef,
	type GridPaginationModel,
} from "@mui/x-data-grid";
import { parametresService } from "@/services/parametresService";
import type { AffaireItem, DepotItem } from "@/types/parametres";
import { besoinTypeService } from "@/services/besoinTypeService";
import { toast } from "sonner";

type SelectionType = "affaires" | "categories" | "depots";

interface SelectionModalProps {
	open: boolean;
	onClose: () => void;
	btId: number;
	type: SelectionType;
}

export default function BesoinTypeSelectionModal({ open, onClose, btId, type }: SelectionModalProps) {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic DataGrid rows
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });
	const [total, setTotal] = useState(0);
const [rows, setRows] = useState<any[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const titleMap: Record<SelectionType, string> = {
		affaires: "Affecter affaires",
		categories: "Affecter catégories",
		depots: "Affecter dépôts",
	};

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			if (type === "affaires") {
				const result = await parametresService.getAffaires({ pageIndex: pagination.page + 1, pageSize: pagination.pageSize });
				setRows(result.data.map((a) => ({ ...a, _id: a.cA_Num }) as Record<string, unknown>));
				setTotal(result.itemsCount);
				const current = await besoinTypeService.getAffaires({ bT_Id: btId, pageIndex: 1, pageSize: 1000 });
				setSelectedIds(current.data.map((a) => a.cA_Num || "").filter(Boolean));
			} else if (type === "categories") {
				const result = await parametresService.getCataloguesForSelect(0);
				setRows(result.map((r) => ({ cA_No: r.value, cA_Intitule: r.text, _id: r.value }) as Record<string, unknown>));
				setTotal(result.length);
				const current = await besoinTypeService.getCategories({ bT_Id: btId, pageIndex: 1, pageSize: 1000 });
				setSelectedIds(current.data.map((c) => String(c.cA_No)).filter(Boolean));
			} else if (type === "depots") {
				const result = await parametresService.getDepots({ pageIndex: pagination.page + 1, pageSize: pagination.pageSize });
				setRows(result.data.map((d) => ({ ...d, _id: d.dE_No }) as Record<string, unknown>));
				setTotal(result.itemsCount);
				const current = await besoinTypeService.getDepots({ bT_Id: btId, pageIndex: 1, pageSize: 1000 });
				setSelectedIds(current.data.map((d) => String(d.dE_No)).filter(Boolean));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur chargement");
		} finally {
			setLoading(false);
		}
	}, [btId, pagination.page, pagination.pageSize, type]);

	useEffect(() => {
		if (open && btId > 0) {
			loadData();
		}
	}, [open, btId, loadData]);

	const handleSave = async () => {
		try {
			setSaving(true);
			if (type === "affaires") {
				await besoinTypeService.addAffaires(btId, selectedIds as any);
			} else if (type === "categories") {
				await besoinTypeService.addCategories(btId, selectedIds.map(Number) as any);
			} else if (type === "depots") {
				await besoinTypeService.addDepots(btId, selectedIds.map(Number) as any);
			}
			toast.success("Enregistrement terminé");
			onClose();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erreur sauvegarde");
		} finally {
			setSaving(false);
		}
	};

	const columns: GridColDef<AffaireItem | { cA_No: number; cA_Intitule: string } | DepotItem>[] = type === "affaires"
		? [
				{ field: "cA_Num", headerName: "Num", width: 100 },
				{ field: "cA_Intitule", headerName: "Intitulé", flex: 1 },
			]
		: type === "categories"
			? [
					{ field: "cA_No", headerName: "No", width: 80 },
					{ field: "cA_Intitule", headerName: "Intitulé", flex: 1 },
				]
			: [
					{ field: "dE_No", headerName: "No", width: 80 },
					{ field: "dE_Intitule", headerName: "Dépôt", flex: 1 },
				];

	// biome-ignore lint/suspicious/noExplicitAny: dynamic row ID
	const getRowId = (row: any) => row._id as string;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>{titleMap[type]}</DialogTitle>
			<DialogContent>
				<DataGrid
					// biome-ignore lint/suspicious/noExplicitAny: dynamic DataGrid rows
					rows={rows as any}
					columns={columns}
					loading={loading}
					rowCount={total}
					paginationMode="server"
					getRowId={getRowId}
					paginationModel={pagination}
					onPaginationModelChange={setPagination}
					checkboxSelection
					disableRowSelectionOnClick
					rowSelectionModel={selectedIds as any}
					// biome-ignore lint/suspicious/noExplicitAny: MUI selection model type mismatch
					onRowSelectionModelChange={(model: any) => {
						const ids = model.ids ? Array.from(model.ids) : Array.isArray(model) ? model : [];
						setSelectedIds(ids.map(String));
					}}
					density="compact"
					sx={{ mt: 1, minHeight: 350 }}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Annuler</Button>
				<Button variant="contained" onClick={handleSave} disabled={saving}>
					Enregistrer
				</Button>
			</DialogActions>
		</Dialog>
	);
}
