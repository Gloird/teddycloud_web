import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TeddyCloudApi } from "../../../../api";
import { defaultAPIConfig } from "../../../../config/defaultApiConfig";
import { useTeddyCloud } from "../../../../contexts/TeddyCloudContext";
import { NotificationTypeEnum } from "../../../../types/teddyCloudNotificationTypes";

const api = new TeddyCloudApi(defaultAPIConfig());

export interface UrlItem {
    id: string;
    url: string;
    title?: string;
    duration?: number;
    thumbnail?: string;
    uploader?: string;
    source?: string;
    status: "pending" | "fetching-info" | "ready" | "downloading" | "complete" | "error";
    progress: number;
    error?: string;
    filePath?: string;
}

export interface UrlFetchOptions {
    quality: string;
}

// List of supported sources by yt-dlp (most popular ones)
export const SUPPORTED_SOURCES = [
    { name: "YouTube", domain: "youtube.com", icon: "🎬" },
    { name: "YouTube Music", domain: "music.youtube.com", icon: "🎵" },
    { name: "SoundCloud", domain: "soundcloud.com", icon: "🎧" },
    { name: "Bandcamp", domain: "bandcamp.com", icon: "💿" },
    { name: "Vimeo", domain: "vimeo.com", icon: "🎥" },
    { name: "Dailymotion", domain: "dailymotion.com", icon: "📺" },
    { name: "Twitch", domain: "twitch.tv", icon: "🎮" },
    { name: "TikTok", domain: "tiktok.com", icon: "📱" },
    { name: "Twitter/X", domain: "twitter.com", icon: "🐦" },
    { name: "Facebook", domain: "facebook.com", icon: "📘" },
    { name: "Instagram", domain: "instagram.com", icon: "📷" },
    { name: "Reddit", domain: "reddit.com", icon: "🤖" },
    { name: "Mixcloud", domain: "mixcloud.com", icon: "🎛️" },
    { name: "Audiomack", domain: "audiomack.com", icon: "🎼" },
    { name: "Deezer", domain: "deezer.com", icon: "🎹" },
    { name: "Spotify (podcast)", domain: "spotify.com", icon: "💚" },
];

export const QUALITY_OPTIONS = [
    { value: "best", label: "Best quality" },
    { value: "320", label: "320 kbps" },
    { value: "256", label: "256 kbps" },
    { value: "192", label: "192 kbps" },
    { value: "128", label: "128 kbps" },
    { value: "worst", label: "Lowest quality (smallest file)" },
];

export const useUrlFetch = () => {
    const { t } = useTranslation();
    const { addNotification } = useTeddyCloud();

    const [urlList, setUrlList] = useState<UrlItem[]>([]);
    const [inputUrl, setInputUrl] = useState("");
    const [quality, setQuality] = useState("best");
    const [isProcessing, setIsProcessing] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);

    // Setup SSE for progress updates
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_APP_TEDDYCLOUD_API_URL || "";
        const eventSource = new EventSource(`${apiUrl}/api/sse`);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener("url-fetch-progress", (event: MessageEvent) => {
            try {
                const data = JSON.parse(JSON.parse(event.data).data);
                const { fetchId, status, progress, filePath, error } = data;

                setUrlList((prev: UrlItem[]) =>
                    prev.map((item: UrlItem) => {
                        if (item.id === fetchId) {
                            return {
                                ...item,
                                status: status === "complete" ? "complete" : status === "error" ? "error" : item.status,
                                progress: progress ?? item.progress,
                                filePath: filePath ?? item.filePath,
                                error: error ?? item.error,
                            };
                        }
                        return item;
                    })
                );
            } catch (e) {
                console.error("Failed to parse SSE data", e);
            }
        });

        eventSource.onerror = () => {
            console.warn("SSE connection error, will retry...");
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const generateId = () => {
        return `url-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };

    const addUrl = useCallback(async () => {
        const url = inputUrl.trim();
        if (!url) return;

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            addNotification(
                NotificationTypeEnum.Error,
                t("tonies.encoder.urlFetch.invalidUrl"),
                t("tonies.encoder.urlFetch.invalidUrlDetails"),
                t("tonies.title")
            );
            return;
        }

        const id = generateId();
        const newItem: UrlItem = {
            id,
            url,
            status: "fetching-info",
            progress: 0,
        };

        setUrlList((prev: UrlItem[]) => [...prev, newItem]);
        setInputUrl("");

        // Fetch URL info
        try {
            const response = await api.apiPostTeddyCloudRaw("/api/urlInfo", `url=${encodeURIComponent(url)}`);
            const result = await response.json();

            if (result.success && result.data) {
                setUrlList((prev: UrlItem[]) =>
                    prev.map((item: UrlItem) =>
                        item.id === id
                            ? {
                                ...item,
                                title: result.data.title,
                                duration: result.data.duration,
                                thumbnail: result.data.thumbnail,
                                uploader: result.data.uploader,
                                source: result.data.source,
                                status: "ready" as const,
                            }
                            : item
                    )
                );
            } else {
                setUrlList((prev: UrlItem[]) =>
                    prev.map((item: UrlItem) =>
                        item.id === id
                            ? {
                                ...item,
                                status: "error" as const,
                                error: result.error || "Failed to fetch URL info",
                            }
                            : item
                    )
                );
            }
        } catch (error) {
            setUrlList((prev: UrlItem[]) =>
                prev.map((item: UrlItem) =>
                    item.id === id
                        ? {
                            ...item,
                            status: "error" as const,
                            error: String(error),
                        }
                        : item
                )
            );
        }
    }, [inputUrl, addNotification, t]);

    const removeUrl = useCallback((id: string) => {
        setUrlList((prev: UrlItem[]) => prev.filter((item: UrlItem) => item.id !== id));
    }, []);

    const clearUrlList = useCallback(() => {
        setUrlList([]);
    }, []);

    const downloadUrl = useCallback(
        async (item: UrlItem): Promise<string | null> => {
            setUrlList((prev: UrlItem[]) =>
                prev.map((u: UrlItem) => (u.id === item.id ? { ...u, status: "downloading" as const, progress: 0 } : u))
            );

            try {
                const response = await api.apiPostTeddyCloudRaw(
                    "/api/urlFetch",
                    `url=${encodeURIComponent(item.url)}&quality=${quality}&fetchId=${item.id}`
                );
                const result = await response.json();

                if (result.success && result.filePath) {
                    setUrlList((prev: UrlItem[]) =>
                        prev.map((u: UrlItem) =>
                            u.id === item.id
                                ? { ...u, status: "complete" as const, progress: 100, filePath: result.filePath }
                                : u
                        )
                    );
                    return result.filePath;
                } else {
                    setUrlList((prev: UrlItem[]) =>
                        prev.map((u: UrlItem) =>
                            u.id === item.id
                                ? { ...u, status: "error" as const, error: result.error || "Download failed" }
                                : u
                        )
                    );
                    return null;
                }
            } catch (error) {
                setUrlList((prev: UrlItem[]) =>
                    prev.map((u: UrlItem) => (u.id === item.id ? { ...u, status: "error" as const, error: String(error) } : u))
                );
                return null;
            }
        },
        [quality]
    );

    const downloadAllUrls = useCallback(async (): Promise<string[]> => {
        setIsProcessing(true);
        const downloadedFiles: string[] = [];

        const readyItems = urlList.filter((item: UrlItem) => item.status === "ready");

        for (const item of readyItems) {
            const filePath = await downloadUrl(item);
            if (filePath) {
                downloadedFiles.push(filePath);
            }
        }

        setIsProcessing(false);
        return downloadedFiles;
    }, [urlList, downloadUrl]);

    const formatDuration = (seconds?: number): string => {
        if (!seconds) return "";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const hasReadyUrls = urlList.some((item: UrlItem) => item.status === "ready");
    const hasUrls = urlList.length > 0;

    return {
        // State
        urlList,
        inputUrl,
        quality,
        isProcessing,
        hasReadyUrls,
        hasUrls,

        // Actions
        setInputUrl,
        setQuality,
        addUrl,
        removeUrl,
        clearUrlList,
        downloadUrl,
        downloadAllUrls,

        // Helpers
        formatDuration,

        // Constants
        SUPPORTED_SOURCES,
        QUALITY_OPTIONS,
    };
};
