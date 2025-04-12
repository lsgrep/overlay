import type React from 'react';
import {
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  CommandLineIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { IconBrandOpenai, IconBrandGoogle, IconRobot, IconBrandGithub } from '@tabler/icons-react';

interface AITool {
  name: string;
  url: string;
  description: string;
  icon: React.ReactNode;
  category: 'Chat' | 'Code' | 'Research' | 'General';
  bgColor?: string;
}

const AI_TOOLS: AITool[] = [
  {
    name: 'Phind',
    url: 'https://phind.com',
    description: 'AI-powered search engine for developers',
    icon: <MagnifyingGlassIcon className="w-6 h-6" />,
    category: 'Code',
    bgColor: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    name: 'Perplexity',
    url: 'https://perplexity.ai',
    description: 'AI research assistant with real-time web search',
    icon: <GlobeAltIcon className="w-6 h-6" />,
    category: 'Research',
    bgColor: 'from-purple-500/20 to-pink-500/20',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai',
    description: 'Advanced AI assistant by Anthropic',
    icon: <IconRobot size={24} />,
    category: 'Chat',
    bgColor: 'from-violet-500/20 to-purple-500/20',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    description: "Google's advanced AI model",
    icon: <IconBrandGoogle size={24} />,
    category: 'General',
    bgColor: 'from-blue-500/20 to-green-500/20',
  },
  {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    description: "OpenAI's conversational AI",
    icon: <IconBrandOpenai size={24} />,
    category: 'Chat',
    bgColor: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    name: 'Hugging Face',
    url: 'https://huggingface.co',
    description: 'Hub for machine learning models and datasets',
    icon: <SparklesIcon className="w-6 h-6" />,
    category: 'Code',
    bgColor: 'from-yellow-500/20 to-orange-500/20',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    description: 'Github',
    icon: <IconBrandGithub size={24} />,
    category: 'Code',
    bgColor: 'from-gray-500/20 to-slate-500/20',
  },
  {
    name: 'Midjourney',
    url: 'https://www.midjourney.com',
    description: 'AI image generation',
    icon: <PaintBrushIcon className="w-6 h-6" />,
    category: 'General',
    bgColor: 'from-pink-500/20 to-rose-500/20',
  },
];

interface AIToolsProps {}

export const AITools: React.FC<AIToolsProps> = () => {
  const categories = Array.from(new Set(AI_TOOLS.map(tool => tool.category)));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map(category => (
          <div key={category} className="space-y-4 relative text-foreground">
            <h3 className="font-medium mb-4 text-foreground">
              {category === 'General' ? 'Featured' : `${category} Tools`}
            </h3>
            <div className="space-y-3">
              {AI_TOOLS.filter(tool => tool.category === category).map(tool => (
                <a
                  key={tool.name}
                  href={tool.url}
                  // target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-4 rounded-lg transition-all duration-300 cursor-pointer relative z-20 bg-gradient-to-br ${tool.bgColor} bg-card/50 hover:bg-card/80 shadow-sm hover:shadow-md hover:scale-105`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/30 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                      {tool.icon}
                    </div>
                    <div>
                      <h4 className="text-foreground font-medium transition-colors duration-200 hover:text-primary">
                        {tool.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
