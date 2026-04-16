// src/pages/besoin/BesoinList.tsx
import { useEffect } from "react";
import { Button, Input, Select, Space, Tag, Tooltip } from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined, FileExcelOutlined, ReloadOutlined } from "@ant-design/icons";
import ProDataGrid, { AntColDef } from "@/pages/article/ProDataGrid";
import type { IBesoin } from "@/types/besoin";
import { useBesoinStore } from "@/store/useBesoinStore";
import * as besoinService from "@/services/besoinservice";

const { Option } = Select;

interface Props {
	onEdit: (b_No: number) => void;
	onView: (b_No: number) => void;
	onNew: () => void;
}

// Couleurs états
const ETAT_COLORS: Record<number, string> = {
	0: "default",
	1: "blue",
	2: "orange",
	3: "cyan",
	4: "purple",
	5: "green",
	6: "red",
	7: "volcano",
	8: "gold",
	9: "lime",
	10: "magenta",
};

const ETAT_LABELS: Record<number, string> = {
	0: "Tous",
	1: "En cours",
	2: "Clôturé",
	3: "En cours de validation",
	4: "À acheter",
	5: "Validé",
	6: "Refusé",
	7: "À rectifier",
	8: "Non pris en charge",
	9: "Acheté",
	10: "En attente de validation",
};

export default function BesoinList({ onEdit, onView, onNew }: Props) {
	const { besoins, totalCount, loading, filter, setFilter, fetchBesoins } = useBesoinStore();

	// ✅ éviter boucle infinie
	useEffect(() => {
		fetchBesoins();
	}, [filter.pageIndex, filter.pageSize, filter.b_Numero, filter.b_Titre, filter.b_Demandeur, filter.b_Etat_Besoin]);

	const columns: AntColDef<IBesoin>[] = [
		{ field: "b_Numero", headerName: "Numéro", width: 120 },
		{ field: "b_Titre", headerName: "Titre", width: 200 },
		{ field: "b_Description", headerName: "Description", width: 250 },
		{ field: "b_Demandeur", headerName: "Demandeur", width: 150 },
		{
			field: "b_Date",
			headerName: "Date",
			width: 130,
			renderCell: ({ value }) => (value ? new Date(value as string).toLocaleDateString("fr-FR") : "-"),
		},
		{ field: "cA_Intitule", headerName: "Affaire", width: 160 },
		{ field: "dE_Intitule", headerName: "Dépôt", width: 130 },
		{
			field: "b_Etat_Besoin",
			headerName: "État",
			width: 170,
			renderCell: ({ value }) => (
				<Tag color={ETAT_COLORS[value as number] ?? "default"}>{ETAT_LABELS[value as number]}</Tag>
			),
		},
		{
			key: "actions",
			headerName: "Actions",
			width: 120,
			renderCell: ({ row }) => (
				<Space>
					<Tooltip title="Voir">
						<Button
							size="small"
							icon={<EyeOutlined />}
							onClick={(e) => {
								e.stopPropagation();
								onView(row.b_No);
							}}
						/>
					</Tooltip>

					<Tooltip title="Modifier">
						<Button
							size="small"
							icon={<EditOutlined />}
							onClick={(e) => {
								e.stopPropagation();
								onEdit(row.b_No);
							}}
						/>
					</Tooltip>
				</Space>
			),
		},
	];

	const handleExportExcel = async () => {
		try {
			const res = await besoinService.exportBesoinExcel(filter);
			const blob = new Blob([res.data], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			const filename =
				res.headers["file-name"] || `Liste_Besoins_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Erreur export Excel", err);
		}
	};

	return (
		<div style={{ padding: 16 }}>
			<Space wrap style={{ marginBottom: 12 }}>
				<Input
					placeholder="Numéro"
					value={filter.b_Numero ?? ""}
					onChange={(e) => setFilter({ b_Numero: e.target.value })}
				/>
				<Input
					placeholder="Titre"
					value={filter.b_Titre ?? ""}
					onChange={(e) => setFilter({ b_Titre: e.target.value })}
				/>
				<Input
					placeholder="Demandeur"
					value={filter.b_Demandeur ?? ""}
					onChange={(e) => setFilter({ b_Demandeur: e.target.value })}
				/>

				<Select
					style={{ width: 200 }}
					value={filter.b_Etat_Besoin ?? 0}
					onChange={(val) => setFilter({ b_Etat_Besoin: val })}
				>
					{Object.entries(ETAT_LABELS).map(([k, v]) => (
						<Option key={k} value={Number(k)}>
							{v}
						</Option>
					))}
				</Select>

				<Button icon={<ReloadOutlined />} onClick={fetchBesoins}>
					Actualiser
				</Button>

				<Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
					Nouveau
				</Button>

				<Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
					Export Excel
				</Button>
			</Space>

			<ProDataGrid<IBesoin>
				rows={besoins}
				columns={columns}
				rowCount={totalCount}
				loading={loading}
				paginationModel={{
					page: (filter.pageIndex ?? 1) - 1,
					pageSize: filter.pageSize ?? 20,
				}}
				onPaginationModelChange={({ page, pageSize }) => setFilter({ pageIndex: page + 1, pageSize })}
				getRowId={(row) => row.b_No}
				onRowDoubleClick={({ row }) => onEdit(row.b_No)}
			/>
		</div>
	);
}
