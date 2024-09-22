import { twofish } from 'twofish';

export function encryptTwofish256ECB(block, key) {
    // Check input lengths
    if (block.length !== 16 || key.length !== 32) {
        throw new Error('Invalid input lengths. Block must be 16 bytes and key must be 32 bytes.');
    }

    // Initialize Twofish cipher
    const tf = twofish(block);

    // Encrypt the block
    const emptyArray = new Uint8Array(16).fill(0);
    const encryptedBlock = tf.encryptCBC(key, emptyArray);

    return new Uint8Array(encryptedBlock);
}

export function decryptTwofish256ECB(block, key) {
    // Check input lengths
    if (block.length !== 16 || key.length !== 32) {
        throw new Error('Invalid input lengths. Block must be 16 bytes and key must be 32 bytes.');
    }

    const emptyArray = new Uint8Array(16).fill(0);

    // Initialize Twofish cipher
    const tf = twofish(emptyArray);

    // Decrypt the block
    const decryptedBlock = tf.decryptCBC(key, block);

    return new Uint8Array(decryptedBlock);
}