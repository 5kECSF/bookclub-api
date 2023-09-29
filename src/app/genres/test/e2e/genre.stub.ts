import { CreateGenreInput } from '../../dto/genres.dto';

export const mockGenre: CreateGenreInput = {
  coverImage: 'tagImage.jpg',
  name: 'new tag',
  restricted: false,
};

export const mockUpdateGenre: CreateGenreInput = {
  coverImage: 'tagImage.jpg',
  name: 'new tag 2',
  restricted: true,
};
