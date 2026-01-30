import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Clock, ArrowRight, Command } from 'lucide-react';
import { searchableItems, fuzzySearch } from '../data/searchData';
import styles from './SearchModal.module.css';

const SearchModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(searchableItems);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState([]);
    const inputRef = useRef(null);
    const resultsRef = useRef(null);

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('recentSearches');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Handle both old format (full objects without icons) and new format (ids)
                const hydrated = parsed.map(savedItem => {
                    const id = typeof savedItem === 'string' ? savedItem : savedItem.id;
                    return searchableItems.find(item => item.id === id);
                }).filter(Boolean); // Remove items that couldn't be found

                setRecentSearches(hydrated);
            }
        } catch (error) {
            console.error('Failed to load recent searches:', error);
            localStorage.removeItem('recentSearches');
        }
    }, []);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Search logic
    useEffect(() => {
        if (query.trim() === '') {
            setResults(searchableItems);
        } else {
            const filtered = fuzzySearch(query, searchableItems);
            setResults(filtered);
        }
        setSelectedIndex(0);
    }, [query]);

    // Filter by category - removed, show all results
    const displayedResults = results;

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev < displayedResults.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (displayedResults[selectedIndex]) {
                        handleNavigate(displayedResults[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, displayedResults, selectedIndex]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current && selectedIndex >= 0) {
            const selectedElement = resultsRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    const handleNavigate = (item) => {
        // Save to recent searches (update state with full item, localStorage with ID)
        const updated = [item, ...recentSearches.filter(r => r.id !== item.id)].slice(0, 5);
        setRecentSearches(updated);

        // Persist only IDs to avoid losing icon components
        const ids = updated.map(i => i.id);
        localStorage.setItem('recentSearches', JSON.stringify(ids));

        navigate(item.path);
        onClose();
        setQuery('');
    };

    const clearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Search Input */}
                <div className={styles.searchBox}>
                    <Search size={20} className={styles.searchIcon} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search pages, features, or actions..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={styles.input}
                    />
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={18} />
                    </button>
                </div>

                {/* Results */}
                <div className={styles.results} ref={resultsRef}>
                    {query === '' && recentSearches.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <Clock size={14} />
                                    Recent Searches
                                </div>
                                <button onClick={clearRecent} className={styles.clearBtn}>Clear</button>
                            </div>
                            {recentSearches.map((item, idx) => (
                                <ResultItem
                                    key={`recent-${item.id}`}
                                    item={item}
                                    isSelected={false}
                                    onClick={() => handleNavigate(item)}
                                />
                            ))}
                        </div>
                    )}

                    {displayedResults.length > 0 ? (
                        displayedResults.map((item, idx) => (
                            <ResultItem
                                key={item.id}
                                item={item}
                                isSelected={idx === selectedIndex}
                                onClick={() => handleNavigate(item)}
                                query={query}
                            />
                        ))
                    ) : (
                        <div className={styles.noResults}>
                            <Search size={48} style={{ opacity: 0.2 }} />
                            <p>No results found for "{query}"</p>
                            <span className={styles.hint}>Try searching by page name, feature, or category</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>

                </div>
            </div>
        </div>
    );
};

const ResultItem = ({ item, isSelected, onClick, query }) => {
    // Fallback if icon is missing
    const Icon = item.icon || Search;

    const highlightText = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? <mark key={`${i}-${part}`} className={styles.highlight}>{part}</mark> : part
        );
    };

    return (
        <div
            className={`${styles.resultItem} ${isSelected ? styles.selected : ''}`}
            onClick={onClick}
        >
            <div className={styles.iconWrapper}>
                <Icon size={14} />
            </div>
            <div className={styles.content}>
                <div className={styles.title}>
                    {highlightText(item.title, query)}
                </div>
                <div className={styles.description}>{item.description}</div>
            </div>
            <div className={styles.meta}>
                <span className={styles.category}>{item.category}</span>
                <ArrowRight size={14} className={styles.arrow} />
            </div>
        </div>
    );
};

export default SearchModal;

