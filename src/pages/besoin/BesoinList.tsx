import { EditOutlined, EyeOutlined, FileExcelOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Input, Select, Space, Tag, Tooltip } from "antd";
import { useEffect } from "react";
import ProDataGrid, { type AntColDef } from "@/pages/article/ProDataGrid";
import * as besoinService from "@/services/besoinService";
import { useBesoinStore } from "@/store/useBesoinStore";
import { Etat_Besoin, type IBesoin } from "@/types/besoin";
import { ETAT_BESOIN_LABELS } from "@/utils/besoin.utils";

const { Option } = Select;

interface Props {
	onEdit: (b_No: number) => void;
	onView: (b_No: number) => void;
	onNew: () => void;
}

const ETAT_COLORS: Record<number, string> = {
	[-1]: "default",
	0: "default",
	1: "blue",
	2: "orange",
	3: "cyan",
	4: "gold",
	5: "red",
	6: "green",
	7: "magenta",
	8: "volcano",
	9: "purple",
	10: "lime",
};

export default function BesoinList({ onEdit, onView, onNew }: Props) {
	const { besoins, totalCount, loading, filter, setFilter, fetchBesoins } = useBesoinStore();

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		void fetchBesoins();
	}, [
		fetchBesoins,
		filter.pageIndex,
		filter.pageSize,
		filter.b_Numero,
		filter.b_Titre,
		filter.b_Demandeur,
		filter.b_Etat_Besoin,
	]);

	const columns: AntColDef<IBesoin>[] = [
		{ field: "b_Numero", headerName: "Numero", width: 130 },
		{ field: "b_Titre", headerName: "Titre", width: 220 },
		{ field: "b_Description", headerName: "Description", width: 280 },
		{ field: "b_Demandeur", headerName: "Demandeur", width: 160 },
		{
			field: "b_Date",
			headerName: "Date",
			width: 140,
			renderCell: ({ value }) => (value ? new Date(value as string).toLocaleDateString("fr-FR") : "-"),
		},
		{ field: "cA_Intitule", headerName: "Affaire", width: 180 },
		{ field: "dE_Intitule", headerName: "Depot", width: 140 },
		{
			field: "b_Etat_Besoin",
			headerName: "Etat",
			width: 200,
			renderCell: ({ value }) => (
				<Tag color={ETAT_COLORS[value as number] ?? "default"}>
					{ETAT_BESOIN_LABELS[value as number] ?? `Etat ${value as number}`}
				</Tag>
			),
		},
		{
			key: "actions",
			headerName: "Actions",
			width: 130,
			renderCell: ({ row }) => (
				<Space>
					<Tooltip title="Voir">
						<Button
							size="small"
							icon={<EyeOutlined />}
							onClick={(event) => {
								event.stopPropagation();
								onView(Number(row.b_No ?? row.B_No ?? 0));
							}}
						/>
					</Tooltip>
					<Tooltip title="Modifier">
						<Button
							size="small"
							icon={<EditOutlined />}
							onClick={(event) => {
								event.stopPropagation();
								onEdit(Number(row.b_No ?? row.B_No ?? 0));
							}}
						/>
					</Tooltip>
				</Space>
			),
		},
	];

	const handleExportExcel = async () => {
		try {
			const response = await besoinService.exportBesoinExcel(filter);
			const fileName =
				response.headers["file-name"] ||
				`Liste_Demandes_Besoin_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;

			const url = URL.createObjectURL(response.data);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = fileName;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Erreur export Excel", error);
		}
	};

	return (
		<div style={{ padding: 16 }}>
			<Space wrap style={{ marginBottom: 12 }}>
				<Input
					placeholder="Numero"
					value={String(filter.b_Numero ?? filter.B_Numero ?? "")}
					onChange={(event) => setFilter({ b_Numero: event.target.value })}
				/>
				<Input
					placeholder="Titre"
					value={String(filter.b_Titre ?? filter.B_Titre ?? "")}
					onChange={(event) => setFilter({ b_Titre: event.target.value })}
				/>
				<Input
					placeholder="Demandeur"
					value={String(filter.b_Demandeur ?? filter.B_Demandeur ?? "")}
					onChange={(event) => setFilter({ b_Demandeur: event.target.value })}
				/>
				<Select
					style={{ width: 220 }}
					value={Number(filter.b_Etat_Besoin ?? filter.B_Etat_Besoin ?? Etat_Besoin.Tous)}
					onChange={(value) => setFilter({ b_Etat_Besoin: value })}
				>
					{Object.entries(ETAT_BESOIN_LABELS).map(([key, label]) => (
						<Option key={key} value={Number(key)}>
							{label}
						</Option>
					))}
				</Select>
				<Button icon={<ReloadOutlined />} onClick={() => void fetchBesoins()}>
					Actualiser
				</Button>
				<Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
					Nouveau
				</Button>
				<Button icon={<FileExcelOutlined />} onClick={() => void handleExportExcel()}>
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
				getRowId={(row) => Number(row.b_No ?? row.B_No ?? 0)}
				onRowDoubleClick={({ row }) => onEdit(Number(row.b_No ?? row.B_No ?? 0))}
			/>
		</div>
	);
}
