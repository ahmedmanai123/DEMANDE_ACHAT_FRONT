import React, { useEffect, useState } from 'react';
import { Modal, Button, Spin, message, Avatar, Tag, Divider, Card, Typography, Space } from 'antd';
import { DownloadOutlined, ArrowLeftOutlined, MailOutlined, UserOutlined, CalendarOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useEmailStore } from '../../store/useEmailStore';

const { Title, Text, Paragraph } = Typography;

const HistoryDetail: React.FC = () => {
	const {
		selectedHistory,
		setSelectedHistory,
		historyLoading,
	} = useEmailStore();

	const [loading, setLoading] = useState(false);

	const handleClose = () => {
		setSelectedHistory(null);
	};

	const handleDownload = async (attachment: any) => {
		try {
			setLoading(true);
			// Logic to download attachment
			message.success('Téléchargement démarré');
		} catch (error) {
			message.error('Erreur lors du téléchargement');
		} finally {
			setLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			'Envoyé': '#52c41a',
			'En_attente': '#faad14',
			'Échoué': '#ff4d4f',
			'Brouillon': '#8c8c8c',
		};
		return colors[status] || '#1890ff';
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Non spécifiée';
		return new Date(dateString).toLocaleString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	if (!selectedHistory) {
		return null;
	}

	const history = selectedHistory as any;

	return (
		<Modal
			title={
				<div className="flex items-center gap-3">
					<MailOutlined className="text-blue-500" />
					<span>Détails de l'historique</span>
				</div>
			}
			open={!!selectedHistory}
			onCancel={handleClose}
			width={900}
			footer={[
				<Button key="back" icon={<ArrowLeftOutlined />} onClick={handleClose}>
					Retour
				</Button>,
			]}
			className="history-detail-modal"
		>
			<Spin spinning={loading || historyLoading}>
				<div className="space-y-6">
					{/* Header Section */}
					<Card className="shadow-sm">
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-4">
								<Avatar 
									size={64} 
									className="bg-blue-500 text-white text-2xl font-bold"
									icon={<UserOutlined />}
								>
									{history.HE_CreateurName?.charAt(0)?.toUpperCase() || 'U'}
								</Avatar>
								<div>
									<Title level={4} className="mb-1">
										{history.HE_CreateurName || 'Inconnu'}
									</Title>
									<div className="flex items-center gap-2 text-gray-500">
										<CalendarOutlined className="text-sm" />
										<Text type="secondary" className="text-sm">
											{formatDate(history.HE_DateEnvoi)}
										</Text>
									</div>
								</div>
							</div>
							<Tag 
								color={getStatusColor(history.HE_Status)} 
								className="text-sm font-medium"
							>
								{history.HE_Status || 'Envoyé'}
							</Tag>
						</div>
					</Card>

					{/* Subject Section */}
					<Card className="shadow-sm">
						<Title level={5} className="mb-3 text-gray-900">
							<MailOutlined className="mr-2" />
							Objet
						</Title>
						<div className="bg-gray-50 p-4 rounded-lg">
							<Text className="text-lg font-medium">
								{history.HE_Objet || 'Sans objet'}
							</Text>
						</div>
					</Card>

					{/* Recipients Section */}
					<Card className="shadow-sm">
						<Title level={5} className="mb-3 text-gray-900">
							<UserOutlined className="mr-2" />
							Destinataires
						</Title>
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="w-2 h-2 rounded-full bg-blue-500" />
								<div>
									<Text strong>À:</Text>
									<Text className="ml-2">{history.HE_Destinataire || 'Non spécifié'}</Text>
								</div>
							</div>
							{history.HE_CCI && (
								<div className="flex items-center gap-3">
									<div className="w-2 h-2 rounded-full bg-gray-400" />
									<div>
										<Text strong>CCI:</Text>
										<Text className="ml-2">{history.HE_CCI}</Text>
									</div>
								</div>
							)}
						</div>
					</Card>

					{/* Content Section */}
					<Card className="shadow-sm">
						<Title level={5} className="mb-3 text-gray-900">
							<MailOutlined className="mr-2" />
							Contenu du message
						</Title>
						<div 
							className="border border-gray-200 rounded-lg p-6 bg-gray-50 max-h-96 overflow-y-auto"
							style={{ minHeight: '200px' }}
						>
							<div 
								className="prose prose-sm max-w-none"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
								dangerouslySetInnerHTML={{ 
									__html: history.HE_Contenu || '<p class="text-gray-500">Aucun contenu</p>' 
								}} 
							/>
						</div>
					</Card>

					{/* Attachments Section */}
					{history.HE_PiecesJointes && history.HE_PiecesJointes.length > 0 && (
						<Card className="shadow-sm">
							<Title level={5} className="mb-3 text-gray-900">
								<PaperClipOutlined className="mr-2" />
								Pièces jointes ({history.HE_PiecesJointes.length})
							</Title>
							<div className="space-y-2">
								{history.HE_PiecesJointes.map((attachment: any, index: number) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										key={index}
										className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
												<PaperClipOutlined className="text-blue-600" />
											</div>
											<div>
												<Text strong className="block">
													{attachment.nom || `piece_jointe_${index + 1}.pdf`}
												</Text>
												<Text type="secondary" className="text-sm">
													{attachment.taille || 'Taille inconnue'}
												</Text>
											</div>
										</div>
										<Button
											type="primary"
											icon={<DownloadOutlined />}
											onClick={() => handleDownload(attachment)}
											loading={loading}
											size="small"
										>
											Télécharger
										</Button>
									</div>
								))}
							</div>
						</Card>
					)}

					{/* No attachments message */}
					{(!history.HE_PiecesJointes || history.HE_PiecesJointes.length === 0) && (
						<Card className="shadow-sm">
							<div className="text-center py-8 text-gray-400">
								<PaperClipOutlined className="text-4xl mb-3" />
								<Text type="secondary">Aucune pièce jointe</Text>
							</div>
						</Card>
					)}
				</div>
			</Spin>
		</Modal>
	);
};

export default HistoryDetail;
