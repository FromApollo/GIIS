import numpy as np

def get_identity():
    return np.eye(4)

def get_translation(dx, dy, dz):
    return np.array([
        [1, 0, 0, dx],
        [0, 1, 0, dy],
        [0, 0, 1, dz],
        [0, 0, 0, 1]
    ])

def get_scale(sx, sy, sz):
    return np.array([
        [sx, 0, 0, 0],
        [0, sy, 0, 0],
        [0, 0, sz, 0],
        [0, 0, 0, 1]
    ])

def get_rotation_x(a):
    return np.array([
        [1, 0, 0, 0],
        [0, np.cos(a), -np.sin(a), 0],
        [0, np.sin(a), np.cos(a), 0],
        [0, 0, 0, 1]
    ])

def get_rotation_y(a):
    return np.array([
        [np.cos(a), 0, np.sin(a), 0],
        [0, 1, 0, 0],
        [-np.sin(a), 0, np.cos(a), 0],
        [0, 0, 0, 1]
    ])

def get_rotation_z(a):
    return np.array([
        [np.cos(a), -np.sin(a), 0, 0],
        [np.sin(a), np.cos(a), 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ])

def get_reflection(plane='xy'):
    m = np.eye(4)
    if plane == 'xy': m[2, 2] = -1
    elif plane == 'yz': m[0, 0] = -1
    elif plane == 'xz': m[1, 1] = -1
    return m