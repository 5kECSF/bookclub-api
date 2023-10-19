import { CreateGenreInput } from '../../dto/genres.dto';

export const mockGenre: CreateGenreInput = {
  name: 'new tag',
  restricted: false,
};

export const mockUpdateGenre: CreateGenreInput = {
  name: 'new tag 2',
  restricted: true,
};
