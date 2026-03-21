import React from 'react';

const PostCard = ({ index, project }) => {
  const { icon, title, description, tags, techSpec } = project;
  const label = String(index).padStart(2, '0');

  return (
    <article className="group relative bg-surface-container-low border-2 border-secondary/20 hover:border-secondary transition-all duration-500 chamfer-card p-1">
      <div className="bg-surface h-full p-8 flex flex-col justify-between min-h-[400px]">
        <div>
          <div className="flex justify-between items-start mb-12">
            <span className="font-label text-secondary text-xs tracking-widest">[ {label} ]</span>
            <span className="material-symbols-outlined text-outline-variant group-hover:text-secondary transition-colors" aria-hidden="true">
              {icon}
            </span>
          </div>

          <h3 className="text-4xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors leading-none mb-6">
            {title}
          </h3>

          <p className="text-on-surface-variant text-sm leading-relaxed mb-8">{description}</p>
        </div>

        <div>
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map((tag) => (
              <span
                key={`${title}-${tag}`}
                className="text-[10px] font-label font-bold uppercase tracking-widest bg-tertiary/10 text-tertiary px-2 py-1 border border-tertiary/20"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="pt-6 border-t border-outline-variant/20 flex justify-between items-center">
            <span className="text-[10px] font-label text-secondary/60 uppercase tracking-widest">Tech_Spec: {techSpec}</span>
            <button className="material-symbols-outlined text-secondary hover:scale-125 transition-transform" aria-label={`Open ${title}`}>
              arrow_outward
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
