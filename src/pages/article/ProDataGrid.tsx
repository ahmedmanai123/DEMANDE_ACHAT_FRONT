// src/pages/article/ProDataGrid.tsx
import { Table } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";
import type { ReactNode } from "react";

export interface AntColDef<T extends object = Record<string, unknown>> {
	field?: string;
	key?: string;
	headerName?: string;
	title?: ReactNode;
	width?: number | string;
	sorter?: ColumnType<T>["sorter"];
	render?: ColumnType<T>["render"];
	renderCell?: (params: { value: unknown; row: T }) => ReactNode;
	valueGetter?: (params: { row: T }) => ReactNode;
}

interface ProDataGridProps<T extends object> {
	rows: T[];
	columns: AntColDef<T>[];
	rowCount: number;
	loading: boolean;
	paginationModel: { page: number; pageSize: number };
	onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
	onRowClick?: (params: { row: T }) => void;
	onRowDoubleClick?: (params: { row: T }) => void;
	getRowId?: (row: T) => string | number;
	/** Sélection visuelle de la ligne (équivalent `.selected-row` jsGrid). */
	selectedRowKey?: string | number | null;
}

function toAntColumns<T extends object>(cols: AntColDef<T>[]): ColumnsType<T> {
	return cols.map((col): ColumnType<T> => {
		// Priorité : renderCell > valueGetter > render natif
		let renderFn: ColumnType<T>["render"];

		if (col.renderCell) {
			const rc = col.renderCell;
			renderFn = (value: unknown, row: T) => rc({ value, row });
		} else if (col.valueGetter) {
			const vg = col.valueGetter;
			renderFn = (_value: unknown, row: T) => vg({ row });
		} else {
			renderFn = col.render;
		}

		return {
			key: col.field ?? col.key,
			dataIndex: col.field,
			title: col.headerName ?? col.title,
			width: col.width,
			sorter: col.sorter,
			render: renderFn,
		};
	});
}

export default function ProDataGrid<T extends object>({
	rows,
	columns,
	rowCount,
	loading,
	paginationModel,
	onPaginationModelChange,
	onRowClick,
	onRowDoubleClick,
	getRowId,
	selectedRowKey,
}: ProDataGridProps<T>) {
	const antColumns = toAntColumns(columns);

	return (
		<Table<T>
			dataSource={rows}
			columns={antColumns}
			loading={loading}
			rowKey={getRowId ? (r) => String(getRowId(r)) : "cbMarq"}
			size="small"
			scroll={{ x: "max-content" }}
			pagination={{
				current: paginationModel.page + 1,
				pageSize: paginationModel.pageSize,
				total: rowCount,
				pageSizeOptions: [10, 20, 50, 100],
				showSizeChanger: true,
				showTotal: (total) => `Total : ${total} enregistrements`,
				onChange: (page, pageSize) => onPaginationModelChange({ page: page - 1, pageSize }),
			}}
			onRow={(record) => ({
				onClick: () => {
					onRowClick?.({ row: record });
				},
				onDoubleClick: () => {
					onRowDoubleClick?.({ row: record });
				},
				style: { cursor: "pointer" },
			})}
			rowClassName={(record) => {
				if (selectedRowKey == null || !getRowId) return "";
				return String(getRowId(record)) === String(selectedRowKey) ? "ant-table-row-selected" : "";
			}}
		/>
	);
}
