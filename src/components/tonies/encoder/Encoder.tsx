import React from "react";
import { Button, Divider, Input, Space, Switch, Tooltip, Upload, theme } from "antd";
import { useTranslation } from "react-i18next";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FolderAddOutlined, InboxOutlined } from "@ant-design/icons";
import { DndContext } from "@dnd-kit/core";
import { MAX_FILES } from "../../../constants/numbers";
import { MyUploadFile } from "../../../utils/audio/audioEncoder";
import { DraggableUploadListItem } from "../common/elements/DraggableUploadListItem";
import { useEncoder } from "./hooks/useEncoder";
import { useUrlFetch } from "./hooks/useUrlFetch";
import { useDirectoryCreate } from "../common/hooks/useCreateDirectory";
import { DirectoryTreeSelect } from "../common/elements/DirectoryTreeSelect";
import CreateDirectoryModal from "../common/modals/CreateDirectoryModal";
import { UrlFetchPanel } from "./UrlFetchPanel";
import { canHover } from "../../../utils/browser/browserUtils";

const { useToken } = theme;

export const Encoder: React.FC = () => {
    const { t } = useTranslation();
    const { token } = useToken();

    const encoder = useEncoder();
    const {
        fileList,
        uploading,
        processing,
        tafFilename,
        hasInvalidChars,
        useFrontendEncoding,
        useFrontendEncodingSetting,

        // Actions
        setUseFrontendEncoding,
        sortFileListAlphabetically,
        clearFileList,
        handleFileNameInputChange,
        handleUpload,
        handleWasmUpload,

        // DnD / Upload
        sensor,
        onDragEnd,
        uploadProps,
        onRemoveUpload,

        // Directory tree
        directoryTree,

        // CreateDirectory / Encoder
        setRebuildList,

        // Helper
        invalidCharactersAsString,
    } = encoder;

    const urlFetch = useUrlFetch();

    const {
        open: isCreateDirectoryModalOpen,
        createDirectoryPath,
        createDirectoryInputKey,
        hasNewDirectoryInvalidChars,
        isCreateDirectoryButtonDisabled,
        inputCreateDirectoryRef,
        openCreateDirectoryModal,
        closeCreateDirectoryModal,
        handleCreateDirectoryInputChange,
        createDirectory,
    } = useDirectoryCreate({
        directoryTree,
        selectNewNode: true,
        setRebuildList,
    });

    // Check if we have content (files or URLs) to encode
    const hasContent = fileList.length > 0 || urlFetch.hasReadyUrls;

    // Combined encode handler that first downloads URLs, then encodes all sources
    const handleCombinedEncode = async () => {
        // If we have URLs to download, download them first
        if (urlFetch.hasReadyUrls) {
            const downloadedFiles = await urlFetch.downloadAllUrls();
            if (downloadedFiles.length === 0 && fileList.length === 0) {
                // All downloads failed and no local files
                return;
            }
            // Note: Downloaded files will be on the server, so we use server-side encoding
            // The server will need to handle combining URL-downloaded files with uploaded files
        }

        // Proceed with encoding (server-side or browser-side)
        if (useFrontendEncoding && fileList.length > 0 && !urlFetch.hasReadyUrls) {
            // WASM encoding only works with local files, not URL downloads
            handleWasmUpload();
        } else {
            handleUpload();
        }
    };

    return (
        <>
            <Space orientation="vertical" style={{ display: "flex" }}>
                {/* URL Fetch Panel - Always visible at top */}
                <UrlFetchPanel urlFetch={urlFetch} encoder={encoder} disabled={uploading || processing} />

                <DndContext sensors={[sensor]} onDragEnd={onDragEnd}>
                    <SortableContext
                        items={fileList.map((i) => i.uid)}
                        strategy={verticalListSortingStrategy}
                        disabled={uploading}
                    >
                        <Upload.Dragger
                            {...uploadProps}
                            disabled={uploading}
                            itemRender={(originNode, file) => (
                                <DraggableUploadListItem
                                    originNode={originNode}
                                    fileList={fileList}
                                    file={file as MyUploadFile}
                                    onRemove={onRemoveUpload}
                                    disabled={uploading}
                                />
                            )}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">
                                {t("tonies.encoder.uploadText", {
                                    maxFiles: MAX_FILES,
                                })}
                            </p>
                            <p className="ant-upload-hint">{t("tonies.encoder.uploadHint")}</p>
                        </Upload.Dragger>
                    </SortableContext>
                </DndContext>

                {hasContent ? (
                    <>
                        {fileList.length > 0 && (
                            <Space
                                orientation="horizontal"
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    flexWrap: "wrap",
                                }}
                            >
                                <Button type="default" disabled={uploading} onClick={sortFileListAlphabetically}>
                                    {t("tonies.encoder.sortAlphabetically")}
                                </Button>
                                <Button
                                    type="default"
                                    disabled={uploading}
                                    style={{ marginRight: 16 }}
                                    onClick={clearFileList}
                                >
                                    {t("tonies.encoder.clearList")}
                                </Button>
                            </Space>
                        )}
                        <Divider />
                        <div style={{ width: "100%" }} className="encoder">
                            <Space orientation="vertical" style={{ width: "100%" }}>
                                <Space.Compact
                                    className="encoder-save-compact"
                                    orientation="horizontal"
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "flex-end",
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <Input
                                        type="text"
                                        className="encoder-save-label"
                                        style={{
                                            maxWidth: 180,
                                            borderTopRightRadius: 0,
                                            borderBottomRightRadius: 0,
                                        }}
                                        disabled
                                        value={t("tonies.encoder.saveAs")}
                                    />

                                    <DirectoryTreeSelect
                                        className="encoder-save-dir"
                                        directoryTree={directoryTree}
                                        disabled={processing || uploading}
                                        placeholder={t("fileBrowser.moveFile.destinationPlaceholder")}
                                    />

                                    <Tooltip
                                        open={!canHover ? false : undefined}
                                        title={t("fileBrowser.createDirectory.createDirectory")}
                                    >
                                        <Button
                                            className="encoder-save-btn"
                                            disabled={uploading || processing}
                                            icon={<FolderAddOutlined />}
                                            onClick={() => {
                                                const basePath = directoryTree.getPathFromNodeId(
                                                    directoryTree.treeNodeId
                                                );
                                                openCreateDirectoryModal(basePath);
                                            }}
                                            style={{ borderRadius: 0 }}
                                        />
                                    </Tooltip>

                                    <Input
                                        className="encoder-save-name"
                                        suffix=".taf"
                                        required
                                        value={tafFilename}
                                        style={{ maxWidth: 300 }}
                                        status={
                                            (hasContent && tafFilename === "") || hasInvalidChars
                                                ? "error"
                                                : ""
                                        }
                                        onChange={handleFileNameInputChange}
                                        disabled={uploading || processing}
                                    />
                                </Space.Compact>
                                {hasInvalidChars ? (
                                    <div style={{ textAlign: "end", color: token.colorErrorText }}>
                                        {t("inputValidator.invalidCharactersDetected", {
                                            invalidChar: invalidCharactersAsString,
                                        })}
                                    </div>
                                ) : null}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "flex-end",
                                        alignItems: "center",
                                        marginTop: 8,
                                        gap: 16,
                                    }}
                                >
                                    <Switch
                                        checkedChildren={t("tonies.encoder.browserSideEncoding")}
                                        unCheckedChildren={t("tonies.encoder.serverSideEncoding")}
                                        defaultChecked={useFrontendEncodingSetting}
                                        checked={useFrontendEncoding}
                                        onChange={setUseFrontendEncoding}
                                        disabled={uploading || processing}
                                    />
                                    <Button
                                        type="primary"
                                        onClick={handleCombinedEncode}
                                        disabled={!hasContent || tafFilename === "" || hasInvalidChars || urlFetch.isProcessing}
                                        loading={uploading || processing || urlFetch.isProcessing}
                                    >
                                        {uploading
                                            ? processing
                                                ? t("tonies.encoder.processing")
                                                : t("tonies.encoder.uploading")
                                            : urlFetch.isProcessing
                                                ? t("tonies.encoder.urlFetch.downloading")
                                                : t("tonies.encoder.encode")}
                                    </Button>
                                </div>
                            </Space>
                        </div>
                    </>
                ) : null}
            </Space>

            {isCreateDirectoryModalOpen && (
                <CreateDirectoryModal
                    open={isCreateDirectoryModalOpen}
                    createDirectoryPath={createDirectoryPath}
                    createDirectoryInputKey={createDirectoryInputKey}
                    hasNewDirectoryInvalidChars={hasNewDirectoryInvalidChars}
                    isCreateDirectoryButtonDisabled={isCreateDirectoryButtonDisabled}
                    inputRef={inputCreateDirectoryRef}
                    onInputChange={handleCreateDirectoryInputChange}
                    onClose={closeCreateDirectoryModal}
                    onCreate={createDirectory}
                />
            )}
        </>
    );
};
