import type { PublicationsContent } from '../types';

export const content: PublicationsContent = {
  writeUp: {
    title: 'V-Surveillance: A Hybrid Deep Learning Framework for Real-Time Aerial Surveillance Using Drone Imagery',
    subtitle: 'Detection and tracking pipeline for drone imagery',
    venue: '2025 IEEE 9th International Conference on Information and Communication Technology (CICT), Chennai',
    date: 'Dec 2025',
    authors: ['Vardaan Bajaj', 'Amit Kumar', 'Shrivishal Tripathi'],
    authorRole: 'First author',
    doi: '10.1109/CICT67193.2025.11399085',
    xploreUrl: 'https://ieeexplore.ieee.org/abstract/document/11399085',
    pills: ['ESRGAN', 'YOLO12m', 'SAHI', 'DeepSORT'],
    summary:
      'A pipeline that combines selective ESRGAN super-resolution, YOLO12m detection with dynamic SAHI slicing, and DeepSORT tracking with ID-retention heuristics, evaluated on four public aerial datasets: UAVDT, Spanish Roundabouts, Traffic Aerial Images and Top-View.',
    contribution:
      'Led the methodology, literature review and pipeline architecture; implementation co-developed and cross-reviewed with Amit Kumar. Supervised by Shrivishal Tripathi.',
    pipeline: [
      {
        title: 'ESRGAN (super-resolution)',
        description: 'Applied selectively to tiles below a resolution threshold.',
      },
      {
        title: 'YOLO12m + SAHI (detection)',
        description: 'Slice size and overlap adjusted to scene density, detections merged with NMS.',
      },
      {
        title: 'DeepSORT (tracking)',
        description:
          'Kalman motion model plus appearance encoder, with ID-retention heuristics when motion blur exceeds a threshold.',
      },
    ],
    results: {
      formula: 'mAP@50 = (1 / |K|) * SUM_k ( INT P_k(R) dR )',
      rows: [
        {
          dataset: 'UAVDT',
          description: 'Large-scale UAV video frames with occlusion tags and weather/altitude labels, urban and highway scenes.',
          precision: '0.935',
          recall: '0.919',
          map50: '0.967',
          map5095: '0.600',
        },
        {
          dataset: 'Spanish Roundabouts',
          description: 'Drone images of roundabouts from top-down and oblique views (car, truck, bus, motorbike).',
          precision: '0.960',
          recall: '0.962',
          map50: '0.966',
          map5095: '0.665',
        },
        {
          dataset: 'Traffic Aerial Images',
          description: 'High-resolution drone imagery of urban roads, highways, intersections and parking areas.',
          precision: '0.942',
          recall: '0.946',
          map50: '0.977',
          map5095: '0.693',
        },
        {
          dataset: 'Top-View',
          description: 'Overhead images from static cameras and UAVs at intersections, road segments and parking lots.',
          precision: '0.907',
          recall: '0.906',
          map50: '0.966',
          map5095: '0.711',
        },
      ],
      training: 'Training: 25 epochs, SGD, mosaic augmentation, label smoothing.',
    },
    // The page heads it "Design decision: <title>".
    decision: {
      title: 'SAHI slicing for small objects',
      problem: 'Small objects in high-altitude drone frames.',
      decision: 'SAHI slicing, with slice size and overlap adjusted to scene density; detections merged with NMS.',
      result: 'mAP@50 of 0.966–0.977 across the four datasets.',
    },
    bibtex: `@inproceedings{bajaj2025vsurveillance,
  title={V-Surveillance: A Hybrid Deep Learning Framework for Real-Time Aerial Surveillance Using Drone Imagery},
  author={Bajaj, Vardaan and Kumar, Amit and Tripathi, Shrivishal},
  booktitle={2025 IEEE 9th International Conference on Information and Communication Technology (CICT)},
  address={Chennai, India},
  year={2025},
  doi={10.1109/CICT67193.2025.11399085},
  publisher={IEEE}
}`,
  },
  citations: [
    {
      title: 'An Enhanced Object-Oriented Programming-Based Web Page Linker',
      venue:
        '2024 IEEE International Conference on Interdisciplinary Approaches in Technology and Management for Social Innovation (IATMSI), Gwalior',
      date: 'Mar 2024',
      authors: ['J. Vijaya', 'Aayush Kulkarni', 'Vaibhav Vikas Ranjan', 'Vardaan Bajaj'],
      authorRole: 'Co-author',
      doi: '10.1109/IATMSI60426.2024.10503405',
      xploreUrl: 'https://ieeexplore.ieee.org/abstract/document/10503405',
      // The whole summary; its second sentence is the contribution line.
      summary:
        'A Python object-oriented wrapper that encapsulates web-page <div> functionality into reusable classes. My part: researching and comparing candidate approaches and technologies, and contributing to the OOP-based implementation.',
    },
  ],
};
