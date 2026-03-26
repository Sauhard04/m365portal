import React from 'react';
import ReactDOM from 'react-dom';
import styles from './Loader3D.module.css';

const Loader3D = ({ text = "Loading", scale = 1, showOverlay = false }) => {
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
