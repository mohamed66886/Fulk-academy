import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from "firebase/firestore";

export const createGenericConverter = <
  T extends Record<string, unknown>,
>(): FirestoreDataConverter<T> => ({
  toFirestore(data: WithFieldValue<T>) {
    return data as Record<string, unknown>;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
    } as unknown as T;
  },
});
