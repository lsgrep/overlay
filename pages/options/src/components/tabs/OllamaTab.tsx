import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@extension/ui/lib/ui';
import { Terminal, Download, ExternalLink, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { t } from '@extension/i18n';

interface OllamaTabProps {
  isLight: boolean;
  isLoadingModels?: boolean;
  modelError?: string | null;
  ollamaModels: Array<{ name: string; displayName?: string; provider: string }>;
}

export const OllamaTab = ({ isLight, isLoadingModels, modelError, ollamaModels }: OllamaTabProps) => {
  const animateIn = {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: 0.1 },
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Ollama</h2>
      <p className="text-muted-foreground mb-6">
        {t(
          'ollama_description',
          'Ollama lets you run open-source large language models locally on your machine. Configure Ollama to use it with Overlay.',
        )}
      </p>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={animateIn}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Terminal className="w-5 h-5 mr-2" />
                {t('ollama_installation_title', 'Installing Ollama')}
              </CardTitle>
              <CardDescription>
                {t('ollama_installation_description', 'First, install Ollama on your computer')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                {t(
                  'ollama_installation_instructions',
                  'Visit the official Ollama website and follow the installation instructions for your operating system:',
                )}
              </p>
              <a
                href="https://ollama.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary hover:underline">
                <Download className="w-4 h-4 mr-1" />
                https://ollama.ai/download
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ ...animateIn, transition: { delay: 0.2 } }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="w-5 h-5 mr-2" />
                {t('ollama_pulling_models_title', 'Pulling Models')}
              </CardTitle>
              <CardDescription>
                {t('ollama_pulling_models_description', 'Download models you want to use')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                {t(
                  'ollama_pulling_models_instructions',
                  'Use the following command to download a model. For example, to download Llama 3:',
                )}
              </p>
              <pre className="p-3 rounded bg-muted overflow-auto text-sm font-mono">ollama pull llama3</pre>
              <p className="text-sm text-muted-foreground">
                {t(
                  'ollama_other_models',
                  'Other popular models include: mistral, gemma, mixtral, phi, orca-mini, and many more.',
                )}
              </p>
              <a
                href="https://ollama.ai/library"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary hover:underline">
                <ExternalLink className="w-4 h-4 mr-1" />
                {t('ollama_view_model_library', 'View the full model library')}
              </a>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ ...animateIn, transition: { delay: 0.3 } }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="w-5 h-5 mr-2" />
                {t('ollama_serve_title', 'Running Ollama with Chrome Extension Support')}
              </CardTitle>
              <CardDescription>
                {t(
                  'ollama_serve_description',
                  'Critical step: Run Ollama with special flags to allow the extension to connect',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium text-destructive">
                {t(
                  'ollama_important_note',
                  'IMPORTANT: You must run Ollama with the OLLAMA_ORIGINS environment variable for Chrome extension support!',
                )}
              </p>
              <p>{t('ollama_serve_instructions', 'Use this command to start Ollama with extension support:')}</p>
              <pre className="p-3 rounded bg-muted overflow-auto text-sm font-mono">
                OLLAMA_ORIGINS=chrome-extension://* ollama serve
              </pre>
              <p className="text-sm text-muted-foreground">
                {t(
                  'ollama_serve_info',
                  'This command allows the extension to connect to your local Ollama server. Keep this terminal window open while using Ollama with Overlay.',
                )}
              </p>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {t('ollama_further_help', 'For more help, visit the Ollama documentation at')}{' '}
                <a
                  href="https://github.com/ollama/ollama/blob/main/docs/api.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline">
                  https://github.com/ollama/ollama/blob/main/docs/api.md
                </a>
              </p>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ ...animateIn, transition: { delay: 0.4 } }}>
          <Card>
            <CardHeader>
              <CardTitle>{t('ollama_available_models', 'Available Models')}</CardTitle>
              <CardDescription>
                {t('ollama_models_description', 'Models detected from your Ollama server')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingModels ? (
                <div className="py-4 text-center text-muted-foreground">{t('loading_models', 'Loading models...')}</div>
              ) : modelError ? (
                <div className="py-4 text-center text-destructive">{modelError}</div>
              ) : ollamaModels.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  {t(
                    'no_ollama_models',
                    'No Ollama models detected. Make sure Ollama is running with the correct flags.',
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-blue-500">
                      {t('options_available_models', 'Available Models')}
                    </h4>
                    <div
                      className={`rounded-md border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                      {ollamaModels.map((model, index) => (
                        <div
                          key={index}
                          className={`p-3 border-b last:border-b-0 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                          <div className="font-medium">{model.displayName || model.name}</div>
                          <div className="text-sm opacity-60 mt-1">{model.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
