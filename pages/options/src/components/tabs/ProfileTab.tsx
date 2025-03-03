import { useStorage } from '@extension/shared';
import {
  firstNameStorage,
  lastNameStorage,
  emailStorage,
  bioStorage,
  resumeStorage,
  defaultLanguageStorage,
} from '@extension/storage';
import { DevLocale, t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Label, Textarea, Button } from '@extension/ui';
import { UserIcon } from '@heroicons/react/24/outline';

interface ProfileTabProps {
  isLight: boolean;
}

export const ProfileTab = ({ isLight }: ProfileTabProps) => {
  const firstName = useStorage(firstNameStorage);
  const lastName = useStorage(lastNameStorage);
  const email = useStorage(emailStorage);
  const bio = useStorage(bioStorage);
  const resume = useStorage(resumeStorage);
  const language = useStorage(defaultLanguageStorage);

  // Update translations when language changes
  useEffect(() => {
    if (language) {
      // Set the locale directly from storage
      t.devLocale = language as DevLocale;
      console.log('ProfileTab: Language set to', language);
    }
  }, [language]);

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

        {/* Resume */}
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
