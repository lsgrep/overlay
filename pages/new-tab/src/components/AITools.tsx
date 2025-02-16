import React from 'react';

interface AITool {
  name: string;
  url: string;
  description: string;
  icon: string;
  category: 'chat' | 'code' | 'research' | 'general';
}

const AI_TOOLS: AITool[] = [
  {
    name: 'Phind',
    url: 'https://phind.com',
    description: 'AI-powered search engine for developers',
    icon: '🔍',
    category: 'code',
  },
  {
    name: 'Perplexity',
    url: 'https://perplexity.ai',
    description: 'AI research assistant with real-time web search',
    icon: '🌐',
    category: 'research',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai',
    description: 'Advanced AI assistant by Anthropic',
    icon: '🤖',
    category: 'chat',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    description: "Google's advanced AI model",
    icon: '🎯',
    category: 'general',
  },
  {
    name: 'ChatGPT',
    url: 'https://chat.openai.com',
    description: "OpenAI's conversational AI",
    icon: '💬',
    category: 'chat',
  },
  {
    name: 'Hugging Face',
    url: 'https://huggingface.co',
    description: 'Hub for machine learning models and datasets',
    icon: '🤗',
    category: 'code',
  },
  {
    name: 'GitHub Copilot',
    url: 'https://github.com/features/copilot',
    description: 'AI pair programmer',
    icon: '👨‍💻',
    category: 'code',
  },
  {
    name: 'Midjourney',
    url: 'https://www.midjourney.com',
    description: 'AI image generation',
    icon: '🎨',
    category: 'general',
  },
];

interface AIToolsProps {
  isLight: boolean;
}

export const AITools: React.FC<AIToolsProps> = ({ isLight }) => {
  const categories = Array.from(new Set(AI_TOOLS.map(tool => tool.category)));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map(category => (
          <div key={category} className={`space-y-4 relative ${isLight ? 'text-gray-800' : 'text-white'}`}>
            <h3 className="text-lg font-semibold capitalize mb-4">
              {category === 'general' ? 'Featured' : `${category} Tools`}
            </h3>
            <div className="space-y-3">
              {AI_TOOLS.filter(tool => tool.category === category).map(tool => (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-4 rounded-lg transition-all duration-200 cursor-pointer relative z-20 ${
                    isLight
                      ? 'bg-white/50 hover:bg-white/80 shadow-sm hover:shadow-md'
                      : 'bg-gray-800/50 hover:bg-gray-800/80 shadow-sm hover:shadow-md'
                  } hover:scale-105`}>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl transition-transform duration-200" role="img" aria-label={tool.name}>
                      {tool.icon}
                    </span>
                    <div>
                      <h4 className="font-medium transition-colors duration-200 hover:text-indigo-500">{tool.name}</h4>
                      <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{tool.description}</p>
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
