// ============================================
// AKOLABS - Stockage IndexedDB
// ============================================

var FileStorage = {
    dbName: 'akolabs_files',
    dbVersion: 1,
    db: null
};

FileStorage.open = function() {
    return new Promise(function(resolve, reject) {
        if (FileStorage.db) {
            resolve(FileStorage.db);
            return;
        }

        var request = indexedDB.open(FileStorage.dbName, FileStorage.dbVersion);

        request.onupgradeneeded = function(event) {
            var idb = event.target.result;
            if (!idb.objectStoreNames.contains('files')) {
                var store = idb.createObjectStore('files', { keyPath: 'id' });
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('fileType', 'fileType', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            FileStorage.db = event.target.result;
            resolve(FileStorage.db);
        };

        request.onerror = function(event) {
            console.error('[Storage] Erreur IndexedDB:', event);
            reject(event);
        };
    });
};

FileStorage.saveFile = function(fileData) {
    return new Promise(async function(resolve, reject) {
        try {
            var idb = await FileStorage.open();
            var tx = idb.transaction('files', 'readwrite');
            var store = tx.objectStore('files');

            var record = {
                id: fileData.id || ('file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
                userId: fileData.userId,
                fileName: fileData.fileName,
                fileType: fileData.fileType || 'other',
                fileSize: fileData.fileSize || 0,
                mimeType: fileData.mimeType || '',
                blob: fileData.blob,
                sectionId: fileData.sectionId || null,
                sectionTitle: fileData.sectionTitle || '',
                savedAt: new Date().toISOString()
            };

            var request = store.put(record);
            request.onsuccess = function() { resolve(record); };
            request.onerror = function(e) { reject(e); };
        } catch (e) {
            reject(e);
        }
    });
};

FileStorage.getFile = function(fileId) {
    return new Promise(async function(resolve, reject) {
        try {
            var idb = await FileStorage.open();
            var tx = idb.transaction('files', 'readonly');
            var store = tx.objectStore('files');
            var request = store.get(fileId);
            request.onsuccess = function() { resolve(request.result || null); };
            request.onerror = function(e) { reject(e); };
        } catch (e) {
            reject(e);
        }
    });
};

FileStorage.getAllFiles = function(userId) {
    return new Promise(async function(resolve, reject) {
        try {
            var idb = await FileStorage.open();
            var tx = idb.transaction('files', 'readonly');
            var store = tx.objectStore('files');
            var index = store.index('userId');
            var request = index.getAll(userId);
            request.onsuccess = function() { resolve(request.result || []); };
            request.onerror = function(e) { reject(e); };
        } catch (e) {
            reject(e);
        }
    });
};

FileStorage.deleteFile = function(fileId) {
    return new Promise(async function(resolve, reject) {
        try {
            var idb = await FileStorage.open();
            var tx = idb.transaction('files', 'readwrite');
            var store = tx.objectStore('files');
            var request = store.delete(fileId);
            request.onsuccess = function() { resolve(true); };
            request.onerror = function(e) { reject(e); };
        } catch (e) {
            reject(e);
        }
    });
};

FileStorage.getTotalSize = function(userId) {
    return new Promise(async function(resolve, reject) {
        try {
            var files = await FileStorage.getAllFiles(userId);
            var total = 0;
            for (var i = 0; i < files.length; i++) {
                total += files[i].fileSize || 0;
            }
            resolve(total);
        } catch (e) {
            resolve(0);
        }
    });
};

FileStorage.formatSize = function(bytes) {
    if (bytes === 0) return '0 B';
    var sizes = ['B', 'Ko', 'Mo', 'Go'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};

FileStorage.getFileCategory = function(fileName) {
    if (!fileName) return 'other';
    var ext = fileName.split('.').pop().toLowerCase();
    if (['pdf'].indexOf(ext) !== -1) return 'pdf';
    if (['doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].indexOf(ext) !== -1) return 'doc';
    if (['mp4', 'avi', 'mkv', 'mov', 'webm'].indexOf(ext) !== -1) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].indexOf(ext) !== -1) return 'image';
    if (['apk'].indexOf(ext) !== -1) return 'apk';
    return 'other';
};

FileStorage.getFileIcon = function(category) {
    var icons = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word',
        video: 'fa-file-video',
        image: 'fa-file-image',
        apk: 'fa-android',
        other: 'fa-file'
    };
    return icons[category] || 'fa-file';
};