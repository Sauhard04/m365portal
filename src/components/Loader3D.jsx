import React from 'react';
import ReactDOM from 'react-dom';
import styles from './Loader3D.module.css';

const Loader3D = ({ text = "Loading", scale = 1, showOverlay = false, onCancel = null }) => {
    const content = (
        <div className={styles.wrapper}>
            <div className={styles.loaderContainer} style={{ transform: `scale(${scale})` }}>
                <div className={styles.cube}>
                    <div className={`${styles.face} ${styles.face1}`}></div>
                    <div className={`${styles.face} ${styles.face2}`}></div>
                    <div className={`${styles.face} ${styles.face3}`}></div>
                    <div className={`${styles.face} ${styles.face4}`}></div>
                    <div className={`${styles.face} ${styles.face5}`}></div>
                    <div className={`${styles.face} ${styles.face6}`}></div>
                </div>
            </div>
            {text && (
                <p className={styles.text} style={{ marginTop: scale < 1 ? '-20px' : '0' }}>
                    {text}
                </p>
            )}

            {(showOverlay || onCancel) && (
                <button 
                    onClick={() => {
                        if (onCancel) onCancel();
                        else window.history.back();
                    }}
                    style={{
                        marginTop: '24px', padding: '6px 20px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: '20px',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                        position: 'relative', zIndex: 100
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#9ca3af';
                    }}
                >
                    Cancel
                </button>
            )}
        </div>
    );

    if (showOverlay) {
        return ReactDOM.createPortal(
            <div className={styles.overlay}>
                {content}
            </div>,
            document.body
        );
    }

    return content;
};

export default Loader3D;
