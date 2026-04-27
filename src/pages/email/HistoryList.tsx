import React, { useEffect, useState } from 'react';
import { Table, Button, Spin, message, Popconfirm } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useEmailStore } from '../../store/useEmailStore';

const HistoryList: React.FC = () => {
	const {
		history,
		historyLoading,
		selectedHistory,
		setSelectedHistory,
		deleteHistory,
		fetchHistory,
	} = useEmailStore();

	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	// Helper functions
	const stripHtml = (html: string | undefined | null) => {
		if (!html) return '';
		return html.replace(/<[^>]*>/g, '').substring(0, 50) + '...';
	};

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			Envoyé: '#28a745',
			En_attente: '#ffc107',
			Échoué: '#dc3545',
			Brouillon: '#6c757d',
		};
		return colors[status] || '#6c757d';
	};

	// Handler functions
	const handleRowSelection = (ids: React.Key[]) => {
		setSelectedIds(ids.map(id => Number(id)));
	};

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedIds(history.map((item: any) => item.H_No));
		} else {
			setSelectedIds([]);
		}
	};

	const handleView = (record: any) => {
		setSelectedHistory(record);
	};

	const handleDelete = async (id: number) => {
		try {
			await deleteHistory([id]);
			message.success('Historique supprimé avec succès');
			setSelectedIds([]);
			fetchHistory();
		} catch (error) {
			message.error('Erreur lors de la suppression de l\'historique');
		}
	};

	const deleteSelectedHistory = async () => {
		try {
			await deleteHistory(selectedIds);
			message.success('Historiques supprimés avec succès');
			setSelectedIds([]);
			fetchHistory();
		} catch (error) {
			message.error('Erreur lors de la suppression des historiques');
		}
	};

	// Columns for Ant Design Table
	const columns = [
		{
			title: 'Intitulé',
			dataIndex: 'H_Intitule',
			key: 'H_Intitule',
			render: (text: string, record: any) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
      <span
					style={{
						color: '#212529',
						cursor: 'pointer',
						padding: '2px 0 3px 0',
						overflow: 'hidden',
						verticalAlign: 'middle',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						display: 'inline-block',
						maxWidth: '300px',
					}}
					onClick={() => handleView(record)}
				>
					{text || ''}
				</span>
			),
		},
		{
			title: 'Type',
			dataIndex: 'H_Type',
			key: 'H_Type',
			render: (type: string) => (
				<span
					style={{
						backgroundColor: getStatusColor(type),
						fontSize: '12px',
						padding: '4px 8px',
						borderRadius: '4px',
						color: 'white',
						display: 'inline-block',
					}}
				>
					{type || ''}
				</span>
			),
		},
		{
			title: 'Destinataire',
			dataIndex: 'H_Destinataire',
			key: 'H_Destinataire',
			render: (text: string) => <span>{text || ''}</span>,
		},
		{
			title: 'Date envoi',
			dataIndex: 'H_DateEnvoi',
			key: 'H_DateEnvoi',
			render: (date: string) => (
				<span>
					{date ? new Date(date).toLocaleDateString('fr-FR') : ''}
				</span>
			),
		},
		{
			title: 'Actions',
			key: 'actions',
			width: 120,
			render: (text: any, record: any) => (
				<div style={{ display: 'flex', gap: '8px' }}>
					<Button
						type="link"
						icon={<EyeOutlined />}
						onClick={() => handleView(record)}
						style={{ padding: '4px 8px' }}
					>
						Voir
					</Button>
					<Popconfirm
						title="Voulez-vous supprimer cet historique ?"
						onConfirm={() => handleDelete(record.H_No)}
						okText="Oui"
						cancelText="Non"
					>
						<Button
							type="link"
							danger
							icon={<DeleteOutlined />}
							style={{ padding: '4px 8px' }}
						>
							Supprimer
						</Button>
					</Popconfirm>
				</div>
			),
		},
	];

	// Row selection configuration
	const rowSelection = {
		selectedRowKeys: selectedIds,
		onChange: handleRowSelection,
	};

	// Loading state
	if (historyLoading && (!history || history.length === 0)) {
		return (
			<div style={{ textAlign: 'center', padding: '80px' }}>
				<Spin size="large" />
			</div>
		);
	}

	// Empty state
	if (!historyLoading && (!history || history.length === 0)) {
		return (
			<div style={{ textAlign: 'center', padding: '80px' }}>
				<p>Aucun historique trouvé</p>
				<Button type="primary" onClick={() => fetchHistory()}>
					Rafraîchir
				</Button>
			</div>
		);
	}

	const historyListStyle = {
		marginTop: '0',
	};

	const tableCellStyle = {
		verticalAlign: 'middle' as const,
		whiteSpace: 'nowrap' as const,
	};

	const checkboxStyle = {
		marginTop: '-13px',
		height: '20px',
	};

	const linkStyle = {
		color: '#212529',
		padding: '2px 0 3px 0',
		overflow: 'hidden' as const,
		verticalAlign: 'middle' as const,
		textOverflow: 'ellipsis' as const,
		whiteSpace: 'nowrap' as const,
		display: 'inline-block' as const,
	};

	const unreadRowStyle = {
		fontWeight: '400',
	};

	const ligneHistoStyle = {
		cursor: 'pointer',
	};

	const ligneHistoHoverStyle = {
		backgroundColor: '#f5f5f5',
	};

	return (
		<div className="history-list">
			<div className="inbox-center" style={historyListStyle}>
				{/* Action buttons */}
				<div style={{ marginBottom: '16px' }}>
					<Popconfirm
						title="Voulez-vous supprimer ces historiques ?"
						onConfirm={() => deleteSelectedHistory()}
						okText="Oui"
						cancelText="Non"
						disabled={selectedIds.length === 0}
					>
						<Button danger disabled={selectedIds.length === 0}>
							Supprimer la sélection
						</Button>
					</Popconfirm>
				</div>

				{/* History table */}
				<Table
					rowSelection={rowSelection}
					columns={columns}
					dataSource={history}
					rowKey="H_No"
					loading={historyLoading}
					pagination={false}
					className="table table-hover no-wrap"
					onRow={(record) => ({
						className: 'unread ligneHisto cursor-pointer',
						style: ligneHistoStyle,
						onDoubleClick: () => handleView(record),
						onMouseEnter: (e) => {
							e.currentTarget.style.backgroundColor = '#f5f5f5';
						},
						onMouseLeave: (e) => {
							e.currentTarget.style.backgroundColor = '';
						},
					})}
					rowClassName={(record) => (record.read ? '' : 'unread')}
				/>
			</div>
		</div>
	);
};

export default HistoryList;
