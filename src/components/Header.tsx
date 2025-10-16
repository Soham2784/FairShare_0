
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Brain, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onOpenAIPredictor: () => void;
}

const Header: React.FC<HeaderProps> = ({ onCreateGroup, onJoinGroup, onOpenAIPredictor }) => {
  const { user, signOut } = useAuth();
  return (
    <header className="bg-card border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-gradient rounded-xl shadow-glow">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-gradient">Fairshare</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onOpenAIPredictor}
              className="hidden sm:inline-flex items-center space-x-2 hover:bg-ai-primary/10 hover:border-ai-primary/50 hover:text-ai-primary transition-colors"
            >
              <Brain className="h-4 w-4" />
              <span>AI Predictor</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={onJoinGroup}
              className="hidden sm:inline-flex items-center space-x-2 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Join Group</span>
            </Button>
            
            <Button
              onClick={onCreateGroup}
              className="bg-primary-gradient hover:opacity-90 shadow-glow transition-all duration-300 hover:shadow-xl"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Group
            </Button>

            {user && (
              <Button
                variant="ghost"
                onClick={signOut}
                className="ml-2"
                title="Sign out"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
