import { useStorage } from '@extension/shared';
import {
  firstNameStorage,
  lastNameStorage,
  emailStorage,
  bioStorage,
  resumeStorage,
  resumeFileStorage,
  defaultLanguageStorage,
} from '@extension/storage';
import type { DevLocale } from '@extension/i18n';
import { t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Label, Textarea, Button } from '@extension/ui';
import { UserIcon, DocumentIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProfileTabProps {
  isLight: boolean;
}

export const ProfileTab = ({ isLight }: ProfileTabProps) => {
  const firstName = useStorage(firstNameStorage);
  const lastName = useStorage(lastNameStorage);
  const email = useStorage(emailStorage);
  const bio = useStorage(bioStorage);
  const resume = useStorage(resumeStorage);
  const resumeFile = useStorage(resumeFileStorage);
  const language = useStorage(defaultLanguageStorage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Update translations when language changes
  useEffect(() => {
    if (language) {
      // Set the locale directly from storage
      t.devLocale = language as DevLocale;
      console.log('ProfileTab: Language set to', language);
    }
  }, [language]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      setUploadError(t('options_profile_resume_file_type_error'));
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('options_profile_resume_file_size_error'));
      return;
    }

    setUploadError(null);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = e => {
      const base64String = e.target?.result as string;
      // Remove the data:application/pdf;base64, prefix
      const base64Data = base64String.split(',')[1];

      resumeFileStorage.set({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    resumeFileStorage.set(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{t('options_profile_settings')}</h2>
        <p className="text-sm text-muted-foreground">{t('options_profile_description')}</p>
      </div>

      <div className="space-y-6">
        {/* First Name */}
        <div className="space-y-2">
          <Label
            htmlFor="first-name"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_profile_first_name')}
          </Label>
          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={e => firstNameStorage.set(e.target.value)}
            className={`w-full p-2 rounded-md border ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder={t('options_profile_first_name_placeholder')}
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label
            htmlFor="last-name"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_profile_last_name')}
          </Label>
          <input
            id="last-name"
            type="text"
            value={lastName}
            onChange={e => lastNameStorage.set(e.target.value)}
            className={`w-full p-2 rounded-md border ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder={t('options_profile_last_name_placeholder')}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_profile_email')}
          </Label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => emailStorage.set(e.target.value)}
            className={`w-full p-2 rounded-md border ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder={t('options_profile_email_placeholder')}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label
            htmlFor="bio"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_profile_bio')}
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={e => bioStorage.set(e.target.value)}
            className={`w-full p-2 rounded-md border min-h-[100px] ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder={t('options_profile_bio_placeholder')}
          />
          <p className="text-xs text-muted-foreground">{t('options_profile_bio_description')}</p>
        </div>

        {/* Resume Text */}
        <div className="space-y-2">
          <Label
            htmlFor="resume"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_profile_resume')}
          </Label>
          <Textarea
            id="resume"
            value={resume}
            onChange={e => resumeStorage.set(e.target.value)}
            className={`w-full p-2 rounded-md border min-h-[200px] ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder={t('options_profile_resume_placeholder')}
          />
          <p className="text-xs text-muted-foreground">{t('options_profile_resume_description')}</p>
        </div>

        {/* Resume File Upload */}
        <div className="space-y-2">
          <Label
            htmlFor="resume-file"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_profile_resume_file')}
          </Label>

          {resumeFile ? (
            <div
              className={`flex items-center p-3 rounded-md border ${
                isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
              }`}>
              <DocumentIcon className="w-5 h-5 mr-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">{resumeFile.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(resumeFile.fileSize)}</p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                title={t('options_profile_resume_file_remove')}>
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="mt-1">
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center w-full p-3 border border-dashed rounded-md cursor-pointer ${
                  isLight ? 'hover:bg-gray-50 border-gray-300' : 'hover:bg-gray-900 border-gray-700'
                }`}>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  name="file-upload"
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
                <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                <span>{t('options_profile_resume_file_upload')}</span>
              </label>
            </div>
          )}

          {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}

          <p className="text-xs text-muted-foreground">{t('options_profile_resume_file_description')}</p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            {t('options_profile_save')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
