import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { requireFirebaseStorage } from "@/lib/firebase";

export const screenshotAllowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
export const screenshotMaxSize = 5 * 1024 * 1024;

export type UploadedScreenshot = {
  screenshotPath: string;
  screenshotUrl: string;
};

export function validateScreenshotFile(file: File) {
  if (!screenshotAllowedTypes.includes(file.type as (typeof screenshotAllowedTypes)[number])) {
    return "Upload a PNG, JPG, JPEG, or WEBP image.";
  }

  if (file.size > screenshotMaxSize) {
    return "Screenshot must be 5MB or smaller.";
  }

  return null;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function uploadTradeScreenshot(userId: string, tradeId: string, file: File): Promise<UploadedScreenshot> {
  const validationError = validateScreenshotFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const screenshotPath = `users/${userId}/trade-screenshots/${tradeId}/${Date.now()}-${safeFileName(file.name)}`;
  const storageRef = ref(requireFirebaseStorage(), screenshotPath);
  await uploadBytes(storageRef, file, { contentType: file.type });

  return {
    screenshotPath,
    screenshotUrl: await getDownloadURL(storageRef)
  };
}

export async function deleteTradeScreenshot(screenshotPath?: string) {
  if (!screenshotPath) {
    return;
  }

  await deleteObject(ref(requireFirebaseStorage(), screenshotPath));
}
