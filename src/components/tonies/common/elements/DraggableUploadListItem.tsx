import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { humanFileSize } from "../../../../utils/files/humanFileSize";
import { MyUploadFile } from "../../../../utils/audio/audioEncoder";
import { Tag } from "antd";

const { Text } = Typography;

interface DraggableUploadListItemProps {
    originNode: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
    fileList: MyUploadFile<any>[];
    file: MyUploadFile<any>;
    onRemove: (file: MyUploadFile) => void;
    disabled: boolean;
}

export const DraggableUploadListItem = ({
    originNode,
    fileList,
    file,
    onRemove,
    disabled,
}: DraggableUploadListItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: file.uid,
    });

    const { t } = useTranslation();

    const draggingStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: "move",
    };

    return (
        <div
            ref={setNodeRef}
            style={draggingStyle}
            className={isDragging ? "is-dragging" : ""}
            {...attributes}
            {...listeners}
        >
            <div className="ant-upload-list-item ant-upload-list-item-undefined">
                <div className="ant-upload-list-item-thumbnail ant-upload-list-item-file">
                    <span role="img" aria-label="file" className="anticon anticon-file">
                        {fileList.indexOf(file) + 1}.
                    </span>
                </div>
                <span className="ant-upload-list-item-name" title={file.name}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span className="">{file.name}</span>
                            <Text type="secondary">{humanFileSize(file.size ?? -1)}</Text>
                        </div>
                        <div style={{ flex: 1 }}>
                            {file.uploader && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {file.uploader}
                                    </Text>
                                </div>
                            )}
                            {file.duration && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, "0")}
                                    </Text>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "inline-block", marginLeft: 8 }}>
                            {file.sourceType === "url" && (
                                <Tag color="green">Importé{file.sourceInfo ? `: ${file.sourceInfo}` : ""}</Tag>
                            )}
                            {file.serverPath && file.sourceType !== "url" && (
                                <Tag color="purple">Fichier</Tag>
                            )}
                            {file.sourceType === "upload" && !file.serverPath && (
                                <Tag color="orange">Local</Tag>
                            )}
                        </div>
                    </div>
                </span>
                <span className="ant-upload-list-item-actions picture">
                    <Button
                        title={t("tonies.encoder.removeFile")}
                        onClick={() => onRemove(file)}
                        disabled={disabled}
                        icon={<DeleteOutlined />}
                    />
                </span>
            </div>
        </div>
    );
};
