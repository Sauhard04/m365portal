import React from 'react';

const Card3D = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-3d-container ${className}`} {...props}>
            <div className="card-3d p-6 h-full">
                {children}
            </div>
        </div>
    );
};

export default Card3D;
