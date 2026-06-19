import { Play } from "lucide-react";

interface VideoCardProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
}

const VideoCard = ({ videoUrl, thumbnailUrl, title }: VideoCardProps) => {
  return (
    <div className="group relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-muted border border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      {videoUrl ? (
        <iframe
          src={videoUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          </div>
          <p className="text-sm text-muted-foreground text-center px-4">
            {title || "Video coming soon"}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
