import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";

const CameraCapture = ({ onCapture, disabled }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (_error) {
      setCameraError(
        "Unable to access camera. Please allow camera permissions or upload an image file."
      );
      stopCamera();
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to capture image from camera.");
          return;
        }

        const file = new File([blob], `statement-scan-${Date.now()}.png`, {
          type: "image/png",
        });
        onCapture(file);
      },
      "image/png",
      0.95
    );
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card>
      <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">Scan via Camera</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Capture a clear photo of your statement and upload it for OCR parsing.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-700">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-64 w-full object-contain sm:h-80"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isCameraActive ? (
          <Button onClick={startCamera} disabled={disabled}>
            Start Camera
          </Button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCapture}
              disabled={disabled}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Capture and Upload
            </button>
            <Button type="button" variant="secondary" onClick={stopCamera} disabled={disabled}>
              Stop Camera
            </Button>
          </>
        )}
      </div>

      {cameraError ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {cameraError}
        </p>
      ) : null}
    </Card>
  );
};

export default CameraCapture;
