import { CameraManufacturers } from "@shared/types";

export const RESOLUTION_OPTIONS = [
	{ value: "640x480", label: "480p (640×480)", width: 640, height: 480 },
	{ value: "1280x720", label: "720p (1280×720)", width: 1280, height: 720 },
	{ value: "1920x1080", label: "1080p (1920×1080)", width: 1920, height: 1080 },
	{ value: "3840x2160", label: "4K (3840×2160)", width: 3840, height: 2160 },
];

export const FPS_OPTIONS = [5, 10, 15, 20, 25, 30];

// Camera manufacturer configurations
export const CAMERA_MANUFACTURERS: CameraManufacturers = {
	onvif: {
		name: "ONVIF (Universal)",
		defaultPort: "80",
		protocols: ["onvif", "rtsp", "http"],
		urlTemplates: {
			onvif: "onvif://{username}:{password}@{ip}:{port}/onvif/device_service",
			rtsp: "rtsp://{username}:{password}@{ip}:554/onvif1",
			http: "http://{username}:{password}@{ip}:{port}/onvif/snapshot",
		},
		defaultUsername: "admin",
		defaultPassword: "admin",
		notes:
			"ONVIF standard - works with most modern IP cameras. Will auto-discover stream URLs.",
		supportsDiscovery: true,
	},
	hikvision: {
		name: "Hikvision",
		defaultPort: "554",
		protocols: ["rtsp", "http", "onvif"],
		urlTemplates: {
			rtsp_main:
				"rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/101",
			rtsp_sub:
				"rtsp://{username}:{password}@{ip}:{port}/Streaming/Channels/102",
			http: "http://{username}:{password}@{ip}/ISAPI/Streaming/channels/101/picture",
			onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
		},
		defaultUsername: "admin",
		defaultPassword: "admin12345",
		notes:
			"Supports RTSP, HTTP snapshots, and ONVIF. Channel 101 = Main Stream, 102 = Sub Stream",
	},
	dahua: {
		name: "Dahua",
		defaultPort: "554",
		protocols: ["rtsp", "http", "onvif"],
		urlTemplates: {
			rtsp_main:
				"rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0",
			rtsp_sub:
				"rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=1",
			http: "http://{username}:{password}@{ip}/cgi-bin/snapshot.cgi?channel={channel}",
			onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
		},
		defaultUsername: "admin",
		defaultPassword: "admin",
		notes:
			"Supports RTSP, HTTP snapshots, and ONVIF. subtype=0 for main stream, subtype=1 for sub stream",
	},
	axis: {
		name: "Axis",
		defaultPort: "554",
		protocols: ["rtsp", "http", "onvif"],
		urlTemplates: {
			rtsp: "rtsp://{username}:{password}@{ip}:{port}/axis-media/media.amp",
			http: "http://{username}:{password}@{ip}:{port}/axis-cgi/mjpg/video.cgi",
			onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
		},
		defaultUsername: "root",
		defaultPassword: "pass",
		notes: "Supports RTSP, HTTP/MJPEG, and ONVIF streaming",
	},
	amcrest: {
		name: "Amcrest",
		defaultPort: "554",
		protocols: ["rtsp", "http", "onvif"],
		urlTemplates: {
			rtsp_main:
				"rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0",
			rtsp_sub:
				"rtsp://{username}:{password}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=1",
			http: "http://{username}:{password}@{ip}/cgi-bin/snapshot.cgi?channel={channel}",
			onvif: "onvif://{username}:{password}@{ip}:80/onvif/device_service",
		},
		defaultUsername: "admin",
		defaultPassword: "admin",
		notes: "Same as Dahua (OEM). Supports RTSP, HTTP, and ONVIF.",
	},
	foscam: {
		name: "Foscam",
		defaultPort: "88",
		protocols: ["rtsp", "http", "onvif"],
		urlTemplates: {
			rtsp_main: "rtsp://{username}:{password}@{ip}:{port}/videoMain",
			rtsp_sub: "rtsp://{username}:{password}@{ip}:{port}/videoSub",
			http: "http://{username}:{password}@{ip}:{port}/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2",
			onvif: "onvif://{username}:{password}@{ip}:{port}/onvif/device_service",
		},
		defaultUsername: "admin",
		defaultPassword: "",
		notes: "Default port is 88, not 554. Supports RTSP, HTTP, and ONVIF.",
	},
	reolink: {
		name: "Reolink",
		defaultPort: "554",
		protocols: ["rtsp", "http", "onvif"],
		urlTemplates: {
			rtsp_main: "rtsp://{username}:{password}@{ip}:{port}/h264Preview_01_main",
			rtsp_sub: "rtsp://{username}:{password}@{ip}:{port}/h264Preview_01_sub",
			http: "http://{username}:{password}@{ip}/cgi-bin/api.cgi?cmd=Snap&channel=0",
			onvif: "onvif://{username}:{password}@{ip}:8000/onvif/device_service",
		},
		defaultUsername: "admin",
		defaultPassword: "",
		notes: "Supports RTSP, HTTP, and ONVIF. ONVIF port is 8000.",
	},
	custom: {
		name: "Custom/Other",
		defaultPort: "554",
		protocols: ["rtsp", "http", "rtmp", "onvif"],
		urlTemplates: {
			rtsp: "rtsp://{username}:{password}@{ip}:{port}/{path}",
			http: "http://{username}:{password}@{ip}:{port}/{path}",
			rtmp: "rtmp://{ip}:{port}/{path}",
			onvif: "onvif://{username}:{password}@{ip}:{port}/onvif/device_service",
		},
		defaultUsername: "admin",
		defaultPassword: "",
		notes: "Enter custom URL path. Try ONVIF for auto-discovery.",
	},
};
