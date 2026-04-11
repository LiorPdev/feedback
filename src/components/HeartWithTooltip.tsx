"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import Tooltip from "./Tooltip";

export default function HeartWithTooltip({ rewardAmount }: { rewardAmount: number }) {
  const [show, setShow] = useState(false);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShow(!show);
      }}
    >
      <Heart 
        size={16} 
        fill="#ff4d4f" 
        color="#ff4d4f" 
        style={{ marginRight: '6px' }} 
      />
      <Tooltip 
        show={show} 
        message={`האמן אהב את המשוב! קיבלת בונוס של ${rewardAmount} נק' קרדיט`}
        align="center"
        direction="bottom"
      />
    </div>
  );
}
