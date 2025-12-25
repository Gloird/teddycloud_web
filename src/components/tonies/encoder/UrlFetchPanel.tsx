import React from "react";
import {
    Button,
    Input,
    Select,
    Space,
    List,
    Progress,
    Tag,
    Tooltip,
    Typography,
    Collapse,
    Avatar,
    theme,
} from "antd";
import {
    LinkOutlined,
    DeleteOutlined,
    CloudDownloadOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    InfoCircleOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { UrlItem, SUPPORTED_SOURCES, QUALITY_OPTIONS, useUrlFetch } from "./hooks/useUrlFetch";
import EncodeQueueModal from "./modals/EncodeQueueModal";
import { useEncodeQueue } from "./hooks/useEncodeQueue";
import { useEncoder } from "./hooks/useEncoder";
import { message } from "antd";

const { Text } = Typography;
const { useToken } = theme;

interface UrlFetchPanelProps {
    urlFetch: ReturnType<typeof useUrlFetch>;
    disabled?: boolean;
}

export const UrlFetchPanel: React.FC<UrlFetchPanelProps> = ({ urlFetch, disabled = false }) => {
    const { t } = useTranslation();
    const { token } = useToken();

    const {
        urlList,
        inputUrl,
        quality,
        isProcessing,
        hasUrls,
        setInputUrl,
        setQuality,
        addUrl,
        removeUrl,
        clearUrlList,
        formatDuration,
        downloadAllUrls,
        downloadUrl,
        hasReadyUrls,
    } = urlFetch;

    const [queueModalVisible, setQueueModalVisible] = React.useState(false);
    const encode = useEncodeQueue();
    const encoder = useEncoder();

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            addUrl();
        }
    };

    const getStatusIcon = (item: UrlItem) => {
        switch (item.status) {
            case "fetching-info":
            case "downloading":
                return <LoadingOutlined spin style={{ color: token.colorPrimary }} />;
            case "ready":
                return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
            case "complete":
                return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
            case "error":
                return <CloseCircleOutlined style={{ color: token.colorError }} />;
            default:
                return <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />;
        }
    };

    const getStatusTag = (item: UrlItem) => {
        switch (item.status) {
            case "fetching-info":
                return <Tag color="processing">{t("tonies.encoder.urlFetch.fetchingInfo")}</Tag>;
            case "ready":
                return <Tag color="success">{t("tonies.encoder.urlFetch.ready")}</Tag>;
            case "downloading":
                return <Tag color="processing">{t("tonies.encoder.urlFetch.downloading")}</Tag>;
            case "complete":
                return <Tag color="success">{t("tonies.encoder.urlFetch.downloaded")}</Tag>;
            case "error":
                return (
                    <Tooltip title={item.error}>
                        <Tag color="error">{t("tonies.encoder.urlFetch.error")}</Tag>
                    </Tooltip>
                );
            default:
                return <Tag>{t("tonies.encoder.urlFetch.pending")}</Tag>;
        }
    };

    const supportedSourcesContent = (
        <div style={{ padding: "8px 0" }}>
            <Text type="secondary" style={{ marginBottom: 8, display: "block" }}>
                {t("tonies.encoder.urlFetch.supportedSourcesDescription")}
            </Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUPPORTED_SOURCES.map((source: { name: string; domain: string; icon: string }) => (
                    <Tag key={source.domain}>
                        {source.icon} {source.name}
                    </Tag>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ marginTop: 16 }}>
            <Collapse
                items={[
                    {
                        key: "url-fetch",
                        label: (
                            <Space>
                                <LinkOutlined />
                                {t("tonies.encoder.urlFetch.title")}
                                {hasUrls && <Tag color="blue">{urlList.length}</Tag>}
                            </Space>
                        ),
                        children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                                {/* Input Section */}
                                <Space.Compact style={{ width: "100%" }}>
                                    <Input
                                        size="middle"
                                        placeholder={t("tonies.encoder.urlFetch.inputPlaceholder")}
                                        value={inputUrl}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputUrl(e.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                        disabled={disabled || isProcessing}
                                        prefix={<LinkOutlined />}
                                        style={{ flex: 1, minWidth: '72%' }}
                                    />
                                    <Select
                                        size="middle"
                                        value={quality}
                                        onChange={setQuality}
                                        disabled={disabled || isProcessing}
                                        options={QUALITY_OPTIONS.map((opt: { value: string; label: string }) => ({
                                            value: opt.value,
                                            label: t(`tonies.encoder.urlFetch.quality.${opt.value}`, opt.label),
                                        }))}
                                    />
                                    <Button
                                        size="middle"
                                        type="primary"
                                        onClick={addUrl}
                                        disabled={disabled || isProcessing || !inputUrl.trim()}
                                        icon={<CloudDownloadOutlined />}
                                    >
                                        {t("tonies.encoder.urlFetch.addUrl")}
                                    </Button>
                                </Space.Compact>

                                {/* Supported Sources Info */}
                                <Collapse
                                    size="small"
                                    items={[
                                        {
                                            key: "sources",
                                            label: (
                                                <Space>
                                                    <InfoCircleOutlined />
                                                    {t("tonies.encoder.urlFetch.supportedSources")}
                                                </Space>
                                            ),
                                            children: supportedSourcesContent,
                                        },
                                    ]}
                                />

                                {/* URL List */}
                                {hasUrls && (
                                    <>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text strong>
                                                {t("tonies.encoder.urlFetch.urlCount", { count: urlList.length })}
                                            </Text>
                                            <Space>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    onClick={() => downloadAllUrls()}
                                                    disabled={disabled || isProcessing || !hasReadyUrls}
                                                >
                                                    {t("tonies.encoder.urlFetch.downloadAll")}
                                                </Button>
                                                <Button size="small" onClick={() => setQueueModalVisible(true)}>
                                                    Manage encode queue
                                                </Button>
                                                <Button
                                                    size="small"
                                                    danger
                                                    onClick={clearUrlList}
                                                    disabled={disabled || isProcessing}
                                                >
                                                    {t("tonies.encoder.urlFetch.clearAll")}
                                                </Button>
                                            </Space>
                                        </div>

                                        <List
                                            itemLayout="horizontal"
                                            dataSource={urlList}
                                            renderItem={(item: UrlItem) => (
                                                <List.Item
                                                    key={item.id}
                                                    actions={[
                                                        <Button
                                                            key="download"
                                                            type="text"
                                                            icon={<CloudDownloadOutlined />}
                                                            onClick={() => downloadUrl(item)}
                                                            disabled={
                                                                disabled || isProcessing || item.status === "downloading"
                                                            }
                                                        />,
                                                        <Button key="addqueue" type="text" onClick={async () => {
                                                            // Download if needed, then add imported file to upload list
                                                            let filePath = item.filePath;
                                                            if (!filePath) {
                                                                const fp = await downloadUrl(item);
                                                                if (!fp) {
                                                                    message.error("Download failed, cannot import");
                                                                    return;
                                                                }
                                                                filePath = fp;
                                                            }

                                                            // add to encoder upload list with source metadata
                                                            encoder.addServerFile(filePath, item.title || undefined, item.url || item.source || undefined);
                                                            message.success("Imported into upload list");
                                                            setQueueModalVisible(true);
                                                        }}>
                                                            Add to queue
                                                        </Button>,
                                                        <Button
                                                            key="delete"
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => removeUrl(item.id)}
                                                            disabled={
                                                                disabled ||
                                                                isProcessing ||
                                                                item.status === "downloading"
                                                            }
                                                        />,
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        avatar={
                                                            item.thumbnail ? (
                                                                <Avatar
                                                                    shape="square"
                                                                    size={48}
                                                                    src={item.thumbnail}
                                                                />
                                                            ) : (
                                                                <Avatar shape="square" size={48} icon={getStatusIcon(item)} />
                                                            )
                                                        }
                                                        title={
                                                            <Space>
                                                                <Text
                                                                    ellipsis
                                                                    style={{ maxWidth: 400 }}
                                                                    title={item.title || item.url}
                                                                >
                                                                    {item.title || item.url}
                                                                </Text>
                                                                {getStatusTag(item)}
                                                            </Space>
                                                        }
                                                        description={
                                                            <Space direction="vertical" size={0}>
                                                                {item.uploader && (
                                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                                        {item.uploader}
                                                                        {item.source && ` • ${item.source}`}
                                                                        {item.duration && ` • ${formatDuration(item.duration)}`}
                                                                    </Text>
                                                                )}
                                                                {item.status === "downloading" && (
                                                                    <Progress
                                                                        percent={item.progress}
                                                                        size="small"
                                                                        status="active"
                                                                    />
                                                                )}
                                                                {item.status === "error" && (
                                                                    <Text type="danger" style={{ fontSize: 12 }}>
                                                                        {item.error}
                                                                    </Text>
                                                                )}
                                                            </Space>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </>
                                )}
                            </Space>
                        ),
                    },
                ]}
            />
            <EncodeQueueModal visible={queueModalVisible} onClose={() => setQueueModalVisible(false)} />
        </div>
    );
};
